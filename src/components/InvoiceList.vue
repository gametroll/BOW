<script setup>
import { storeToRefs } from 'pinia'
import { useInvoiceStore } from '../stores/invoiceStore'

const invoiceStore = useInvoiceStore()
const { billingPeriod, configurationInvoices, selectedConfiguration, selectedInvoiceId } =
  storeToRefs(invoiceStore)

/**
 * Formats a date string for display.
 *
 * @param {string} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return ''
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}
</script>

<template>
  <aside class="rounded-2xl bg-white p-4 shadow-sm">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">Generated Invoices</h2>
      <p class="text-sm text-slate-500">
        Draft invoices for {{ selectedConfiguration?.name || 'the selected configuration' }}
        in {{ billingPeriod }}.
      </p>
    </div>

    <div
      v-if="configurationInvoices.length"
      class="space-y-3"
    >
      <button
        v-for="invoice in configurationInvoices"
        :key="invoice.id"
        type="button"
        class="w-full rounded-xl border p-4 text-left transition"
        :class="
          selectedInvoiceId === invoice.id
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        "
        @click="invoiceStore.selectInvoice(invoice.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">{{ invoice.id }}</div>
            <div
              class="text-sm"
              :class="selectedInvoiceId === invoice.id ? 'text-slate-200' : 'text-slate-600'"
            >
              {{ invoice.customer }}
            </div>
          </div>

          <span
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="
              selectedInvoiceId === invoice.id
                ? 'bg-white/15 text-white'
                : 'bg-slate-100 text-slate-700'
            "
          >
            {{ invoice.status }}
          </span>
        </div>

        <div
          class="mt-3 text-xs"
          :class="selectedInvoiceId === invoice.id ? 'text-slate-300' : 'text-slate-500'"
        >
          Due {{ formatDate(invoice.dueDate) }}
        </div>
      </button>
    </div>

    <div
      v-else
      class="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500"
    >
      Run billing for the selected configuration to generate invoices here.
    </div>
  </aside>
</template>
