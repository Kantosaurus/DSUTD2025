const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all survival kit items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sk.*, 
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', skr.id,
                   'title', skr.title,
                   'description', skr.description,
                   'order_index', skr.order_index
                 ) ORDER BY skr.order_index
               ) FILTER (WHERE skr.id IS NOT NULL), 
               '[]'::json
             ) as quick_resources
      FROM survival_kit_items sk
      LEFT JOIN survival_kit_resources skr ON sk.id = skr.survival_kit_item_id
      WHERE sk.is_active = true
      GROUP BY sk.id, sk.title, sk.image_url, sk.content, sk.order_index, sk.is_active, sk.created_at, sk.updated_at
      ORDER BY sk.order_index ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching survival kit items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific survival kit item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT sk.*, 
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', skr.id,
                   'title', skr.title,
                   'description', skr.description,
                   'order_index', skr.order_index
                 ) ORDER BY skr.order_index
               ) FILTER (WHERE skr.id IS NOT NULL), 
               '[]'::json
             ) as quick_resources
      FROM survival_kit_items sk
      LEFT JOIN survival_kit_resources skr ON sk.id = skr.survival_kit_item_id
      WHERE sk.id = $1 AND sk.is_active = true
      GROUP BY sk.id, sk.title, sk.image_url, sk.content, sk.order_index, sk.is_active, sk.created_at, sk.updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survival kit item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching survival kit item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;