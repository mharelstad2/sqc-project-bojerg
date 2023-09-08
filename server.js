import express from 'express'
const app = express()
const port = process.env.PORT || 5163

app.use(express.static('./public/'))

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})

// adapted from https://expressjs.com/en/starter/hello-world.html
