import {
    AbstractPaymentProcessor,
    PaymentProcessorContext,
    PaymentProcessorError,
    PaymentProcessorSessionResponse,
    PaymentSessionStatus
  } from "@medusajs/medusa"
  import fetch from 'node-fetch'
  
  class CryptAPIPaymentProcessor extends AbstractPaymentProcessor {
    static identifier = "cryptapi"
  
    private baseUrl: string
    private options: Record<string, unknown>
  
    constructor(container: Record<string, unknown>, options: Record<string, unknown>) {
      super(container)
      this.options = options
      this.baseUrl = "https://api.cryptapi.io"
    }
  
    /**
     * Initiate a payment using CryptAPI
     * @param {PaymentProcessorContext} context - Contains information about the payment
     * @returns {Promise<PaymentProcessorError | PaymentProcessorSessionResponse>}
     */
    async initiatePayment(
      context: PaymentProcessorContext
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
      const { currency_code, amount, resource_id } = context
  
      try {
        const query = new URLSearchParams({
          callback: this.getCallbackUrl(resource_id),
          address: this.options.merchantAddress as string,
          pending: '1',
          confirmations: '1',
          email: this.options.notificationEmail as string || '',
          post: '0',
          json: '1',
          priority: 'default',
          multi_token: '0',
          convert: '1'
        }).toString()
  
        const response = await fetch(`${this.baseUrl}/${this.options.ticker}/create/?${query}`)
        const data = await response.json()
  
        return {
          session_data: {
            id: data.address_in,
            address_in: data.address_in,
            address_out: data.address_out,
            callback_url: data.callback_url,
            amount,
            currency_code,
          },
          update_requests: {
            customer_metadata: {
              cryptapi_payment_address: data.address_in
            }
          }
        }
      } catch (error) {
        return {
          error: error.message,
          code: 'cryptapi_initiate_failed',
        }
      }
    }
  
    /**
     * Authorize a payment
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @param {Record<string, unknown>} context - Additional context for the authorization
     * @returns {Promise<PaymentProcessorError | { status: PaymentSessionStatus; data: Record<string, unknown> }>}
     */
    async authorizePayment(
      paymentSessionData: Record<string, unknown>,
      context: Record<string, unknown> = {}
    ): Promise<
      | PaymentProcessorError
      | { status: PaymentSessionStatus; data: Record<string, unknown> }
    > {
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
    /**
   * Update payment data
   * @param {string} sessionId - The ID of the payment session
   * @param {Record<string, unknown>} data - The data to update
   * @returns {Promise<Record<string, unknown> | PaymentProcessorError>}
   */
    async updatePaymentData(
        sessionId: string,
        data: Record<string, unknown>
      ): Promise<Record<string, unknown> | PaymentProcessorError> {
        try {
          // CryptAPI doesn't support updating payment data directly
          // We'll just return the updated data, which will be stored in Medusa's database
          return {
            ...data,
            id: sessionId
          }
        } catch (error) {
          return {
            error: error.message,
            code: 'cryptapi_update_data_failed',
          }
        }
      }
    /**
     * Capture a payment (Note: CryptAPI payments are captured automatically)
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @returns {Promise<PaymentProcessorError | Record<string, unknown>>}
     */
    async capturePayment(
      paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | Record<string, unknown>> {
      return { status: "captured", ...paymentSessionData }
    }
  
    /**
     * Refund a payment (Note: CryptAPI doesn't support automatic refunds)
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @param {number} refundAmount - The amount to refund
     * @returns {Promise<PaymentProcessorError | Record<string, unknown>>}
     */
    async refundPayment(
      paymentSessionData: Record<string, unknown>,
      refundAmount: number
    ): Promise<PaymentProcessorError | Record<string, unknown>> {
      return {
        error: "Manual refund required",
        code: "manual_refund_required",
        detail: `Please process a manual refund of ${refundAmount} to the customer's wallet.`,
      }
    }
  
    /**
     * Cancel a payment (Note: Crypto transactions can't be cancelled once sent)
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @returns {Promise<PaymentProcessorError | Record<string, unknown>>}
     */
    async cancelPayment(
      paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | Record<string, unknown>> {
      return { status: "canceled", ...paymentSessionData }
    }
  
    /**
     * Get the status of a payment
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @returns {Promise<PaymentSessionStatus>}
     */
    async getPaymentStatus(
      paymentSessionData: Record<string, unknown>
    ): Promise<PaymentSessionStatus> {
      try {
        const query = new URLSearchParams({ 
          callback: this.getCallbackUrl(paymentSessionData.id as string) 
        }).toString()
  
        const response = await fetch(`${this.baseUrl}/${this.options.ticker}/logs/?${query}`)
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
  
    /**
     * Retrieve payment data
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @returns {Promise<PaymentProcessorError | Record<string, unknown>>}
     */
    async retrievePayment(
      paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | Record<string, unknown>> {
      try {
        const query = new URLSearchParams({ 
          callback: this.getCallbackUrl(paymentSessionData.id as string) 
        }).toString()
  
        const response = await fetch(`${this.baseUrl}/${this.options.ticker}/logs/?${query}`)
        const data = await response.json()
        return data
      } catch (error) {
        return {
          error: error.message,
          code: 'cryptapi_retrieve_failed',
        }
      }
    }
  
    /**
     * Update a payment (Note: CryptAPI doesn't support updating payments)
     * @param {PaymentProcessorContext} context - The context for updating the payment
     * @returns {Promise<PaymentProcessorError | PaymentProcessorSessionResponse>}
     */
    async updatePayment(
      context: PaymentProcessorContext
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
      return {
        session_data: context.paymentSessionData,
      }
    }
  
    /**
     * Delete a payment (Note: CryptAPI doesn't support deleting payments)
     * @param {Record<string, unknown>} paymentSessionData - The payment session data
     * @returns {Promise<PaymentProcessorError | Record<string, unknown>>}
     */
    async deletePayment(
      paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | Record<string, unknown>> {
      return {}
    }
  
    /**
     * Generate a QR code for the payment
     * @param {string} address - The payment address
     * @param {number} value - The payment amount
     * @returns {Promise<string>} - The QR code as a base64 encoded string
     */
    async generateQRCode(address: string, value: number): Promise<string> {
      try {
        const query = new URLSearchParams({
          address,
          value: value.toString(),
          size: '512'
        }).toString()
  
        const response = await fetch(`${this.baseUrl}/${this.options.ticker}/qrcode/?${query}`)
        const data = await response.json()
        return data.qr_code
      } catch (error) {
        throw new Error(`Error generating QR code: ${error.message}`)
      }
    }
  
    /**
     * Convert currency to the cryptocurrency amount
     * @param {number} value - The amount to convert
     * @param {string} from - The currency to convert from
     * @returns {Promise<number>} - The converted amount in cryptocurrency
     */
    async convertCurrency(value: number, from: string): Promise<number> {
      try {
        const query = new URLSearchParams({
          value: value.toString(),
          from
        }).toString()
  
        const response = await fetch(`${this.baseUrl}/${this.options.ticker}/convert/?${query}`)
        const data = await response.json()
        return data.value_coin
      } catch (error) {
        throw new Error(`Error converting currency: ${error.message}`)
      }
    }
  
    /**
     * Get the callback URL for CryptAPI
     * @param {string} id - The ID to use in the callback URL
     * @returns {string} - The callback URL
     */
    private getCallbackUrl(id: string): string {
      return `${this.options.callbackBaseUrl}/cryptapi/callback/${id}`
    }
  }
  
  export default CryptAPIPaymentProcessor