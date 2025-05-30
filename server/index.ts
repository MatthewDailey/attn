/**
 * @fileoverview Initializes and starts the main application server, listening on a specified port.
 */

import { createApp } from './app'

const app = await createApp()

const port = process.env.PORT || 8080

app.listen(port, () => {
  console.log(`Listening on port http://localhost:${port}`)
})
