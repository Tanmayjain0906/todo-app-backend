const accessModel = require("../modals/accessModel");

const rateLimitingMiddleware = async(req,res,next) => {
  const sid = req.userInfo.userId;
  try
  {
     const accessDb = await accessModel.findOne({sessionId: sid});

     if(!accessDb)
     {
        const db = new accessModel({
            sessionId: sid,
            lastReqTime: Date.now(),
        });

        await db.save();
        next();
     }
     else
     {
        const newTime = (Date.now() - accessDb.lastReqTime)/(1000);

        console.log(newTime);

        if(newTime < 1)
        
        {
            return res.status(400).json({message: "Too Many Request Wait For Sometime!"});
        }

        await accessModel.findOneAndUpdate({sessionId: sid}, {lastReqTime: Date.now()});
        next();
    }
  }
  catch(err)
  {
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
}

module.exports = rateLimitingMiddleware;