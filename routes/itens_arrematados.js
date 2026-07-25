const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');

// Middleware global da rota: Exige autenticação e permissão para visualizar itens arrematados
router.use(authMiddleware);
router.use(requirePermission('canViewLC'));

router.get('/', async (req, res) => {
    try {
        // Retorna array vazio por enquanto (mock da rota)
        res.json([]);
    } catch (error) {
        console.error('Erro na API Itens Arrematados:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
