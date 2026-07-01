const express = require('express');
const cors = require('cors');
const db = require('./db');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to find the actual LAN IP of the PC
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Helper to format date into HH:MM am/pm matching frontend expectation
function formatTimeStr(date) {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// 1. GET /api/queues/:slug - Get the full queue state and stats
app.get('/api/queues/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Fetch establishment
    const [establishments] = await db.query(
      'SELECT id, nombre, slug, ciudad, direccion, estado, hora_apertura, hora_cierre, url_publica, url_qr FROM establecimientos WHERE slug = ?',
      [slug]
    );

    if (establishments.length === 0) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }

    const est = establishments[0];
    
    // Toggle casing of 'estado' to match frontend expected values ('Abierto' or 'Cerrado')
    const estStatus = est.estado.charAt(0).toUpperCase() + est.estado.slice(1);

    // Fetch active queue (fila)
    const [queues] = await db.query(
      'SELECT id, prefijo, tiempo_promedio_min, numero_actual, ultimo_numero FROM filas WHERE establecimiento_id = ? AND activa = 1 LIMIT 1',
      [est.id]
    );

    if (queues.length === 0) {
      return res.status(404).json({ error: 'Fila activa no encontrada' });
    }

    const queue = queues[0];

    // Fetch all active tickets ('espera', 'atencion')
    const [ticketsRaw] = await db.query(
      'SELECT id, codigo, numero, estado, creado_en FROM turnos WHERE fila_id = ? AND estado IN ("espera", "atencion") ORDER BY numero ASC',
      [queue.id]
    );

    const tickets = ticketsRaw.map(t => ({
      id: t.id,
      code: t.codigo,
      status: t.estado,
      createdAt: formatTimeStr(t.creado_en)
    }));

    // Calculate queue variables
    const currentTicket = tickets.find(t => t.status === 'atencion') || null;
    const nextTicket = tickets.find(t => t.status === 'espera') || null;
    const waitingTickets = tickets.filter(t => t.status === 'espera');
    const peopleInLine = tickets.length;
    const estimatedMinutes = peopleInLine * queue.tiempo_promedio_min;

    // Fetch daily counts for admin stats panel
    const [[{ atendidosCount }]] = await db.query(
      'SELECT COUNT(*) as atendidosCount FROM turnos WHERE fila_id = ? AND estado = "atendido" AND DATE(creado_en) = CURDATE()',
      [queue.id]
    );

    const [[{ atencionCount }]] = await db.query(
      'SELECT COUNT(*) as atencionCount FROM turnos WHERE fila_id = ? AND estado = "atencion" AND DATE(creado_en) = CURDATE()',
      [queue.id]
    );

    const [[{ canceladosCount }]] = await db.query(
      'SELECT COUNT(*) as canceladosCount FROM turnos WHERE fila_id = ? AND estado = "cancelado" AND DATE(creado_en) = CURDATE()',
      [queue.id]
    );

    res.json({
      establishment: {
        name: est.nombre,
        city: est.ciudad,
        slug: est.slug,
        status: estStatus,
        schedule: `${est.hora_apertura.substring(0, 5)} - ${est.hora_cierre.substring(0, 5)}`
      },
      localIp: getLocalIp(),
      tickets,
      currentTicket,
      nextTicket,
      waitingTickets,
      peopleInLine,
      estimatedMinutes,
      stats: {
        atendidos: atendidosCount,
        enAtencion: atencionCount,
        cancelados: canceladosCount,
        promedio: '18 min' // static/computed value for visual simulation
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener la fila' });
  }
});

// 2. POST /api/tickets/claim - Claim a ticket presencially
app.post('/api/tickets/claim', async (req, res) => {
  try {
    const { slug } = req.body;

    const [establishments] = await db.query(
      'SELECT id FROM establecimientos WHERE slug = ?',
      [slug]
    );

    if (establishments.length === 0) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }

    const estId = establishments[0].id;

    // Start transaction to safely assign the next ticket number
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [queues] = await connection.query(
        'SELECT id, prefijo, ultimo_numero FROM filas WHERE establecimiento_id = ? AND activa = 1 FOR UPDATE',
        [estId]
      );

      if (queues.length === 0) {
        throw new Error('Fila activa no encontrada');
      }

      const queue = queues[0];
      const nextNum = queue.ultimo_numero + 1;
      const paddedNum = String(nextNum).padStart(3, '0');
      const code = `${queue.prefijo}-${paddedNum}`;
      
      // Update queue counts
      await connection.query(
        'UPDATE filas SET ultimo_numero = ? WHERE id = ?',
        [nextNum, queue.id]
      );

      // Generate verification token (mock SHA-2/hash)
      const token = require('crypto').randomBytes(32).toString('hex');

      // Insert new ticket
      const [result] = await connection.query(
        'INSERT INTO turnos (fila_id, codigo, numero, token_cliente, estado, origen) VALUES (?, ?, ?, ?, "espera", "qr_presencial")',
        [queue.id, code, nextNum, token]
      );

      // Insert creation event
      await connection.query(
        'INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "creado", "Turno solicitado vía escaneo QR")',
        [result.insertId]
      );

      await connection.commit();
      connection.release();

      res.status(201).json({
        id: result.insertId,
        code,
        status: 'espera',
        createdAt: formatTimeStr(new Date())
      });

    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error del servidor al reclamar turno' });
  }
});

// 3. POST /api/tickets/:id/cancel - Cancel a client's ticket
app.post('/api/tickets/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const [tickets] = await db.query('SELECT id, estado FROM turnos WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    await db.query('UPDATE turnos SET estado = "cancelado", finalizado_en = NOW() WHERE id = ?', [id]);

    await db.query(
      'INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "cancelado", "Cancelado por el cliente desde el portal móvil")',
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar el turno' });
  }
});

// 4. POST /api/queues/:slug/next - Admin: Call next ticket
app.post('/api/queues/:slug/next', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get active queue
    const [queues] = await db.query(
      'SELECT id FROM filas WHERE establecimiento_id = (SELECT id FROM establecimientos WHERE slug = ?) AND activa = 1 LIMIT 1',
      [slug]
    );

    if (queues.length === 0) {
      return res.status(404).json({ error: 'Fila activa no encontrada' });
    }

    const queueId = queues[0].id;

    // 1. Resolve current in-attention ticket to 'atendido'
    const [current] = await db.query(
      'SELECT id FROM turnos WHERE fila_id = ? AND estado = "atencion" LIMIT 1',
      [queueId]
    );

    if (current.length > 0) {
      const curId = current[0].id;
      await db.query('UPDATE turnos SET estado = "atendido", finalizado_en = NOW() WHERE id = ?', [curId]);
      await db.query('INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "atendido", "Atención finalizada con éxito")', [curId]);
    }

    // 2. Call next waiting ticket ('espera') to 'atencion'
    const [next] = await db.query(
      'SELECT id, codigo, numero FROM turnos WHERE fila_id = ? AND estado = "espera" ORDER BY numero ASC LIMIT 1',
      [queueId]
    );

    if (next.length > 0) {
      const nextId = next[0].id;
      const nextNum = next[0].numero;
      await db.query('UPDATE turnos SET estado = "atencion", llamado_en = NOW() WHERE id = ?', [nextId]);
      await db.query('UPDATE filas SET numero_actual = ? WHERE id = ?', [nextNum, queueId]);
      await db.query('INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "llamado", "Llamado a ventanilla")', [nextId]);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al llamar el siguiente turno' });
  }
});

// 5. POST /api/queues/:slug/skip - Admin: Skip current ticket
app.post('/api/queues/:slug/skip', async (req, res) => {
  try {
    const { slug } = req.params;

    const [queues] = await db.query(
      'SELECT id FROM filas WHERE establecimiento_id = (SELECT id FROM establecimientos WHERE slug = ?) AND activa = 1 LIMIT 1',
      [slug]
    );

    if (queues.length === 0) {
      return res.status(404).json({ error: 'Fila activa no encontrada' });
    }

    const queueId = queues[0].id;

    // Get current ticket
    const [current] = await db.query(
      'SELECT id FROM turnos WHERE fila_id = ? AND estado = "atencion" LIMIT 1',
      [queueId]
    );

    // Get next ticket
    const [next] = await db.query(
      'SELECT id, codigo, numero FROM turnos WHERE fila_id = ? AND estado = "espera" ORDER BY numero ASC LIMIT 1',
      [queueId]
    );

    if (current.length > 0 && next.length > 0) {
      const curId = current[0].id;
      const nextId = next[0].id;
      const nextNum = next[0].numero;

      // Current moves back to espera
      await db.query('UPDATE turnos SET estado = "espera" WHERE id = ?', [curId]);
      await db.query('INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "saltado", "Operador saltó el turno; reubicado en la cola")', [curId]);

      // Next moves to attention
      await db.query('UPDATE turnos SET estado = "atencion", llamado_en = NOW() WHERE id = ?', [nextId]);
      await db.query('UPDATE filas SET numero_actual = ? WHERE id = ?', [nextNum, queueId]);
      await db.query('INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "llamado", "Llamado a ventanilla")', [nextId]);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al saltar el turno' });
  }
});

// 6. POST /api/queues/:slug/cancel-current - Admin: Cancel current ticket
app.post('/api/queues/:slug/cancel-current', async (req, res) => {
  try {
    const { slug } = req.params;

    const [queues] = await db.query(
      'SELECT id FROM filas WHERE establecimiento_id = (SELECT id FROM establecimientos WHERE slug = ?) AND activa = 1 LIMIT 1',
      [slug]
    );

    if (queues.length === 0) {
      return res.status(404).json({ error: 'Fila activa no encontrada' });
    }

    const queueId = queues[0].id;

    // Get current ticket
    const [current] = await db.query(
      'SELECT id FROM turnos WHERE fila_id = ? AND estado = "atencion" LIMIT 1',
      [queueId]
    );

    // Get next ticket
    const [next] = await db.query(
      'SELECT id, codigo, numero FROM turnos WHERE fila_id = ? AND estado = "espera" ORDER BY numero ASC LIMIT 1',
      [queueId]
    );

    if (current.length > 0) {
      const curId = current[0].id;
      await db.query('UPDATE turnos SET estado = "cancelado", finalizado_en = NOW() WHERE id = ?', [curId]);
      await db.query('INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "cancelado", "Cancelado por el operador")', [curId]);
    }

    if (next.length > 0) {
      const nextId = next[0].id;
      const nextNum = next[0].numero;
      await db.query('UPDATE turnos SET estado = "atencion", llamado_en = NOW() WHERE id = ?', [nextId]);
      await db.query('UPDATE filas SET numero_actual = ? WHERE id = ?', [nextNum, queueId]);
      await db.query('INSERT INTO eventos_turno (turno_id, evento, detalle) VALUES (?, "llamado", "Llamado a ventanilla")', [nextId]);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar el turno actual' });
  }
});

// 7. POST /api/establishments/:slug/toggle-status - Admin: Toggle open/closed status
app.post('/api/establishments/:slug/toggle-status', async (req, res) => {
  try {
    const { slug } = req.params;

    const [establishments] = await db.query(
      'SELECT id, estado FROM establecimientos WHERE slug = ?',
      [slug]
    );

    if (establishments.length === 0) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }

    const est = establishments[0];
    const newStatus = est.estado === 'abierto' ? 'cerrado' : 'abierto';

    await db.query('UPDATE establecimientos SET estado = ? WHERE id = ?', [newStatus, est.id]);

    res.json({ success: true, status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar el estado del establecimiento' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend de Fila-Cero corriendo en http://0.0.0.0:${PORT}`);
});
