'use client';

import { use } from 'react';
import { InvoiceForm } from '../invoice-form';

export default function FaturaDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InvoiceForm invoiceId={id} />;
}
