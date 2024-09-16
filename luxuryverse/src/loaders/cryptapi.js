const CryptAPIPaymentProcessor = require("../services/cryptapi")

module.exports = async (container, options) => {
  const paymentProviderService = container.resolve("paymentProviderService")
  
  const cryptAPIProvider = new CryptAPIPaymentProcessor(container, {
    merchantAddress: process.env.CRYPTAPI_MERCHANT_ADDRESS || '0xc4A66A79CDA4dfB2416a036A2826DFAaBBAB84e9',
    notificationEmail: process.env.CRYPTAPI_NOTIFICATION_EMAIL,
    ticker: process.env.CRYPTAPI_TICKER || "eth",
    callbackBaseUrl: process.env.CRYPTAPI_CALLBACK_BASE_URL || "http://localhost:9000/admin/custom"
  })
  
  paymentProviderService.registerProvider(cryptAPIProvider)
}