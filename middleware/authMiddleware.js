const jwt = require('jsonwebtoken');

// Usando um segredo no .env, mas com um fallback genérico apenas para fins de desenvolvimento inicial
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

const authMiddleware = (req, res, next) => {
    // Pegar o token do header de autorização
    const authHeader = req.header('Authorization');

    // Se não tiver token, retornar 401 Unauthorized
    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    try {
        // Formato esperado: "Bearer <token>"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Acesso negado. Token malformado.' });
        }

        // Verificar o token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Adicionar o payload do usuário à requisição (req.user)
        req.user = decoded;
        next(); // Passar para a próxima rota
    } catch (err) {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = {
    authMiddleware,
    JWT_SECRET
};
