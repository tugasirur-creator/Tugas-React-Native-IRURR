import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();

app.use(cors()); // izinkan akses lintas asal (CORS)
app.use(express.json()); // baca body berformat JSON

app.get('/', (req, res) => {
  res.send('API Pengeluaran berjalan');
});

// -----------------------------------------------------------------
// 1. GET /pengeluaran - Ambil semua data (Serta catatan & kategori)
// -----------------------------------------------------------------
app.get('/pengeluaran', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        p.id, 
        p.judul, 
        p.nominal, 
        p.catatan, 
        p.tanggal, 
        p.dibuat_pada AS created_at,
        IFNULL(k.nama, 'Tanpa Kategori') AS kategori
      FROM pengeluaran p
      LEFT JOIN kategori k ON p.id_kategori = k.id
      ORDER BY p.id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('Error GET /pengeluaran:', e);
    res.status(500).json({ pesan: 'Gagal mengambil data' });
  }
});

// -----------------------------------------------------------------
// 2. GET /kategori - Ambil daftar kategori untuk dropdown frontend
// -----------------------------------------------------------------
app.get('/kategori', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT nama FROM kategori ORDER BY id ASC');
    const categoriesList = rows.map((r) => r.nama);
    res.json(categoriesList);
  } catch (e) {
    console.error('Error GET /kategori:', e);
    res.status(500).json({ pesan: 'Gagal mengambil daftar kategori' });
  }
});

// -----------------------------------------------------------------
// 3. GET /pengeluaran/:id - Detail pengeluaran
// -----------------------------------------------------------------
app.get('/pengeluaran/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        p.id, 
        p.judul, 
        p.nominal, 
        p.catatan, 
        p.tanggal, 
        p.dibuat_pada AS created_at,
        IFNULL(k.nama, 'Tanpa Kategori') AS kategori
      FROM pengeluaran p
      LEFT JOIN kategori k ON p.id_kategori = k.id
      WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error('Error GET /pengeluaran/:id:', e);
    res.status(500).json({ pesan: 'Gagal mengambil data' });
  }
});

// -----------------------------------------------------------------
// 4. POST /pengeluaran - Tambah pengeluaran
// -----------------------------------------------------------------
app.post('/pengeluaran', async (req, res) => {
  const { judul, nominal, kategori, catatan } = req.body;

  if (!judul || !nominal) {
    return res.status(400).json({ pesan: 'Judul & nominal wajib diisi' });
  }

  try {
    // Lookup id_kategori berdasarkan nama kategori dari frontend
    let id_kategori = null;
    if (kategori && kategori !== 'Tanpa Kategori') {
      const [catRows] = await pool.query('SELECT id FROM kategori WHERE nama = ?', [kategori]);
      if (catRows.length > 0) id_kategori = catRows[0].id;
    }

    const [hasil] = await pool.query(
      `INSERT INTO pengeluaran (judul, nominal, id_kategori, catatan, tanggal)
       VALUES (?, ?, ?, ?, CURDATE())`,
      [judul.trim(), Number(nominal), id_kategori, catatan ? catatan.trim() : '']
    );

    res.status(201).json({
      id: hasil.insertId,
      judul: judul.trim(),
      nominal: Number(nominal),
      kategori: kategori || 'Tanpa Kategori',
      catatan: catatan || '',
      pesan: 'Data berhasil disimpan',
    });
  } catch (e) {
    console.error('Error POST /pengeluaran:', e);
    res.status(500).json({ pesan: 'Gagal menyimpan data' });
  }
});

// -----------------------------------------------------------------
// 5. PUT /pengeluaran/:id - Ubah pengeluaran
// -----------------------------------------------------------------
app.put('/pengeluaran/:id', async (req, res) => {
  const { judul, nominal, kategori, catatan } = req.body;

  if (!judul || !nominal) {
    return res.status(400).json({ pesan: 'Judul & nominal wajib diisi' });
  }

  try {
    let id_kategori = null;
    if (kategori && kategori !== 'Tanpa Kategori') {
      const [catRows] = await pool.query('SELECT id FROM kategori WHERE nama = ?', [kategori]);
      if (catRows.length > 0) id_kategori = catRows[0].id;
    }

    const [hasil] = await pool.query(
      `UPDATE pengeluaran 
       SET judul = ?, nominal = ?, id_kategori = ?, catatan = ? 
       WHERE id = ?`,
      [judul.trim(), Number(nominal), id_kategori, catatan ? catatan.trim() : '', req.params.id]
    );

    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }

    res.json({ pesan: 'Data berhasil diperbarui' });
  } catch (e) {
    console.error('Error PUT /pengeluaran/:id:', e);
    res.status(500).json({ pesan: 'Gagal memperbarui data' });
  }
});

// -----------------------------------------------------------------
// 6. DELETE /pengeluaran/:id - Hapus pengeluaran
// -----------------------------------------------------------------
app.delete('/pengeluaran/:id', async (req, res) => {
  try {
    const [hasil] = await pool.query('DELETE FROM pengeluaran WHERE id = ?', [req.params.id]);

    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }

    res.status(204).end();
  } catch (e) {
    console.error('Error DELETE /pengeluaran/:id:', e);
    res.status(500).json({ pesan: 'Gagal menghapus data' });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT} dan siap diakses jaringan lokal`);
});