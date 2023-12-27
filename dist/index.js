import { app } from "./app.js";
import connectDB from "./db/index.js";
import { config } from "dotenv";
config({
    path: "./.env",
});
connectDB()
    .then(() => {
    app.on("error", (err) => {
        console.log(`Server Error`, err);
        throw err;
    });
    app.listen(process.env.PORT ?? 8000, () => {
        console.log(`Server is running at port:${process.env.PORT}`);
    });
})
    .catch((err) => {
    console.log("Mongo db connection failed !!!", err);
});
//# sourceMappingURL=index.js.map