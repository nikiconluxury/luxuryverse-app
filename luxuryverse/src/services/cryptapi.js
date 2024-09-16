const { PaymentService } = require("@medusajs/medusa")

class CryptAPIPaymentProcessor extends PaymentService {
  static identifier = "usd-eth"

  constructor(_, options) {
    super(_, options)
    this.options_ = options
    console.log('CryptAPIPaymentProcessor instantiated');
    console.log('Options:', JSON.stringify(options));
    this.baseUrl = 'https://api.cryptapi.io' // Make sure this is set
  }
  async initiatePayment(context) {
    const { currency_code, amount, resource_id } = context
    console.log('Initiating CryptAPI payment:', { currency_code, amount, resource_id })

    try {
      const query = new URLSearchParams({
        callback: this.getCallbackUrl(resource_id),
        address: this.options.merchantAddress,
        pending: '1',
        confirmations: '1',
        email: this.options.notificationEmail || '',
        post: '0',
        json: '1',
        priority: 'default',
        multi_token: '0',
        convert: '1'
     }).toString();

     const url = `${this.baseUrl}/${this.options_.ticker}/create/?${query}`
     console.log('CryptAPI request URL:', url)

     const response = await fetch(url);
     const data = await response.json();

     console.log('CryptAPI response:', data)

     if (!response.ok) {
       throw new Error(`CryptAPI request failed: ${data.error || response.statusText}`);
     }

     const sessionData = {
       id: data.address_in,
       address_in: data.address_in,
       address_out: data.address_out,
       callback_url: data.callback_url,
       amount,
       currency_code,
     }

     console.log('CryptAPI session data:', sessionData)

     return {
       session_data: sessionData,
       update_requests: {
         customer_metadata: {
           cryptapi_payment_address: data.address_in
         }
       }
     }
   } catch (error) {
     console.error('CryptAPI initiate payment error:', error)
     return {
       error: error.message,
       code: 'cryptapi_initiate_failed',
     }
   }
 }

  async authorizePayment(paymentSessionData, context) {
    try {
      const status = await this.getPaymentStatus(paymentSessionData)
      return {
        status,
        data: paymentSessionData,
      }
    } catch (error) {
      return {
        error: error.message,
        code: 'cryptapi_authorize_failed',
      }
    }
  }

  async capturePayment(paymentSessionData) {
    return { status: "captured", ...paymentSessionData }
  }

  async refundPayment(paymentSessionData, refundAmount) {
return {
  error: "Manual refund required",
  code: "manual_refund_required",
   detail: "Please process a manual refund to the customer's wallet."
}
  }

  async cancelPayment(paymentSessionData) {
    return { status: "canceled", ...paymentSessionData }
  }

  async getPaymentStatus(paymentSessionData) {
    try {
      const query = new URLSearchParams({ 
        callback: this.getCallbackUrl(paymentSessionData.id) 
      }).toString()

      const response = await fetch(this.baseUrl + '/' + this.options.ticker + '/logs/?' + query);
      const data = await response.json()
      
      if (data.callbacks && data.callbacks.length > 0) {
        const latestCallback = data.callbacks[data.callbacks.length - 1]
        return latestCallback.pending ? PaymentSessionStatus.PENDING : PaymentSessionStatus.AUTHORIZED
      }
      return PaymentSessionStatus.PENDING
    } catch (error) {
      return PaymentSessionStatus.ERROR
    }
  }

  async retrievePayment(paymentSessionData) {
    try {
      const query = new URLSearchParams({ 
        callback: this.getCallbackUrl(paymentSessionData.id) 
      }).toString()

      const response = await fetch(this.baseUrl + '/' + this.options.ticker + '/logs/?' + query);
      const data = await response.json()
      return { ...paymentSessionData, ...data }
    } catch (error) {
      return {
        error: error.message,
        code: 'cryptapi_retrieve_failed',
      }
    }
  }

  async updatePayment(context) {
    return {
      session_data: context.paymentSessionData,
    }
  }

  async updatePaymentData(sessionId, data) {
    return { ...data, id: sessionId }
  }

  async deletePayment(paymentSessionData) {
    return {}
  }

  getCallbackUrl(id) {
      return this.options.callbackBaseUrl + '/cryptapi/callback/' + id
  }
}


export default CryptAPIPaymentProcessor