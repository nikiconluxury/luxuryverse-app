import { MedusaRequest, MedusaResponse } from "@medusajs/medusa";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  res.sendStatus(200);
}
import { Router } from "express"
import bodyParser from "body-parser"

export default () => {
  const router = Router()

  router.post("/cryptapi/callback/:id", bodyParser.json(), async (req, res) => {
    const { id } = req.params
    const { address_in, txid_in, confirmations, paid_amount } = req.body

    // TODO: Implement your logic to update the payment status
    // You'll need to use Medusa's services to update the payment
    // based on the callback data
    console.log(`Received callback for order ${id}`)
    res.sendStatus(200)
  })

  return router
}