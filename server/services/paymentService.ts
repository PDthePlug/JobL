import { PaymentTransaction, VoucherRedemption } from '../../src/types.js';

/**
 * Payment Abstraction Interface according to Section 13 of Build Directive
 */
export interface IPaymentProvider {
  createPayment(
    opportunityId: string, 
    candidateEmail: string, 
    method: 'PEACH_PAYMENTS' | 'OZOW_EFT' | 'JOBL_VOUCHER',
    voucherCode?: string
  ): Promise<PaymentTransaction>;

  verifyPayment(transactionId: string): Promise<PaymentTransaction>;
}

export class VoucherProvider {
  // In-memory ledger of legitimate vouchers
  private vouchers: Map<string, VoucherRedemption> = new Map([
    ['JOBL-R5-FREE-2026', {
      code: 'JOBL-R5-FREE-2026',
      valueAmount: 5.00,
      status: 'ISSUED',
      issueDate: '2026-08-01T00:00:00.000Z',
      expiryDate: '2026-12-31T23:59:59.000Z',
    }],
    ['JOBL-YES-YOUTH-R5', {
      code: 'JOBL-YES-YOUTH-R5',
      valueAmount: 5.00,
      status: 'ISSUED',
      issueDate: '2026-08-01T00:00:00.000Z',
      expiryDate: '2026-12-31T23:59:59.000Z',
    }],
    ['JOBL-COMMUNITY-2026', {
      code: 'JOBL-COMMUNITY-2026',
      valueAmount: 5.00,
      status: 'ISSUED',
      issueDate: '2026-08-01T00:00:00.000Z',
      expiryDate: '2026-12-31T23:59:59.000Z',
    }],
  ]);

  redeemVoucher(code: string, candidateEmail: string): VoucherRedemption {
    const cleanCode = code.trim().toUpperCase();
    const voucher = this.vouchers.get(cleanCode);

    if (!voucher) {
      throw new Error('Invalid voucher code. Please check and try again.');
    }

    if (voucher.status === 'REDEEMED') {
      throw new Error('This voucher code has already been redeemed.');
    }

    if (voucher.status === 'LOCKED' || voucher.status === 'EXPIRED') {
      throw new Error('This voucher code is no longer active or has expired.');
    }

    const now = new Date().toISOString();
    const ref = `VOUCH-TX-${Date.now()}`;

    voucher.status = 'REDEEMED';
    voucher.redemptionTimestamp = now;
    voucher.transactionReference = ref;

    this.vouchers.set(cleanCode, voucher);
    return voucher;
  }
}

export class JobLPaymentService implements IPaymentProvider {
  private transactions: Map<string, PaymentTransaction> = new Map();
  private voucherProvider = new VoucherProvider();
  private txCounter = 1000;

  async createPayment(
    opportunityId: string,
    candidateEmail: string,
    method: 'PEACH_PAYMENTS' | 'OZOW_EFT' | 'JOBL_VOUCHER',
    voucherCode?: string
  ): Promise<PaymentTransaction> {
    const txId = `TX-JOBL-${Date.now()}-${this.txCounter++}`;
    const now = new Date().toISOString();

    if (method === 'JOBL_VOUCHER') {
      if (!voucherCode) {
        throw new Error('Voucher code is required for voucher payment method.');
      }
      // Validate voucher server-side
      const voucher = this.voucherProvider.redeemVoucher(voucherCode, candidateEmail);

      const tx: PaymentTransaction = {
        transactionId: txId,
        provider: 'JOBL_VOUCHER',
        amount: 5.00,
        currency: 'ZAR',
        status: 'VERIFIED', // Instantly verified upon successful voucher redemption
        timestamp: now,
        reference: voucher.transactionReference || `VOUCH-${txId}`,
        candidateEmail,
        opportunityId,
        paymentMethodDetails: `JobL Application Voucher: ${voucher.code}`,
      };

      this.transactions.set(txId, tx);
      return tx;
    }

    // Peach Payments or Ozow EFT Simulation / Integration Sandbox
    const ref = method === 'PEACH_PAYMENTS' 
      ? `PEACH-SA-${Date.now()}` 
      : `OZOW-EFT-${Date.now()}`;

    const tx: PaymentTransaction = {
      transactionId: txId,
      provider: method,
      amount: 5.00,
      currency: 'ZAR',
      status: 'VERIFIED', // In sandbox environment, Peach / Ozow returns instant server verification
      timestamp: now,
      reference: ref,
      candidateEmail,
      opportunityId,
      paymentMethodDetails: method === 'PEACH_PAYMENTS' ? 'Peach Payments (SA Card / Instant EFT)' : 'Ozow Instant EFT',
    };

    this.transactions.set(txId, tx);
    return tx;
  }

  async verifyPayment(transactionId: string): Promise<PaymentTransaction> {
    const tx = this.transactions.get(transactionId);
    if (!tx) {
      throw new Error('Transaction record not found.');
    }
    if (tx.status !== 'VERIFIED') {
      throw new Error('Payment transaction is not verified.');
    }
    return tx;
  }
}
