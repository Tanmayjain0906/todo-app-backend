const jwt = require("jsonwebtoken");

const isAuthMiddleware = (req, res, next) => {
  let token = req.headers.authorization;
  if(!token)
  {
    return res.status(401).json({message: "No Token Provided"});
  }

  token = token.split(" ");
  token = token[1].trim();

  try
  {
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    req.userInfo = decode;
    next();
  }
  catch(err)
  {
    return res.status(401).json({message: "Session Expired Please Login Again"});
  }
}

module.exports = isAuthMiddleware;