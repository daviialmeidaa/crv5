const jwt = require('jsonwebtoken');

// Usando o segredo definido no arquivo .env
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn("AVISO: JWT_SECRET não definido no .env!");
}

const authMiddleware = (req, res, next) => {
    // Pegar o token do header de autorização ou da query string
    const authHeader = req.header('Authorization');
    let token = req.query.token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Se não tiver token, retornar 401 Unauthorized
    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    try {

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
