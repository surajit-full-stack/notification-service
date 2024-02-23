import pkg from "jsonwebtoken";
import { notificationdb } from "./index.js";

const { verify } = pkg;

export const sendData = (req, res) => {
 
  const token = req.cookies["access-token"];
 

  const { groupIds } = req.body;

  const validToken = verify(token, process.env.JWT_SECRET_KEY);
  if (!validToken) {
    console.log("id", id);
    return res.status(401).json({ status: 401, err: "un-authorized" });
  }
  const { id } = validToken;
  let queryList = JSON.parse(groupIds);

  notificationdb.get(queryList, id).then((data) => {
    res.status(200).json({ data });
  });
};
