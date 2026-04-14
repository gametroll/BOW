<script setup>
import { storeToRefs } from 'pinia'
import { useInvoiceStore } from '../stores/invoiceStore'
import LineItemRow from './LineItemRow.vue'

const invoiceStore = useInvoiceStore()

const { selectedConfiguration, selectedInvoice, selectedSubtotal, selectedTax, selectedGrandTotal } =
  storeToRefs(invoiceStore)

/**
 * Formats currency for display.
 *
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))
}
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm">
    <template v-if="selectedInvoice">
      <div class="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-2xl font-bold">{{ selectedInvoice.id }}</h2>
          <p class="text-sm text-slate-500">Invoice details and line item editor</p>
        </div>

        <button
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          @click="invoiceStore.addLineItem"
        >
          Add Line Item
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Customer</span>
          <input
            :value="selectedInvoice.customer"
            type="text"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            @input="invoiceStore.updateSelectedInvoiceField('customer', $event.target.value)"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select
            :value="selectedInvoice.status"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            @change="invoiceStore.updateSelectedInvoiceField('status', $event.target.value)"
          >
            <option>Draft</option>
            <option>Sent</option>
            <option>Paid</option>
            <option>Past Due</option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Due Date</span>
          <input
            :value="selectedInvoice.dueDate"
            type="date"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            @input="invoiceStore.updateSelectedInvoiceField('dueDate', $event.target.value)"
          />
        </label>
      </div>

      <div class="mt-6">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-semibold">Line Items</h3>
          <span class="text-sm text-slate-500">
            {{ selectedInvoice.lineItems.length }} item(s)
          </span>
        </div>

        <TransitionGroup
          name="line-item-list"
          tag="div"
          class="line-item-list space-y-3"
        >
          <LineItemRow
            v-for="item in selectedInvoice.lineItems"
            :key="item.id"
            :item="item"
          />
        </TransitionGroup>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              :value="selectedInvoice.notes"
              rows="5"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              @input="invoiceStore.updateSelectedInvoiceField('notes', $event.target.value)"
            />
          </label>
        </div>

        <div class="rounded-2xl bg-slate-50 p-4">
          <h3 class="mb-4 text-lg font-semibold">Summary</h3>

          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Subtotal</span>
              <span class="font-medium">{{ formatCurrency(selectedSubtotal) }}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-600">Tax</span>
              <span class="font-medium">{{ formatCurrency(selectedTax) }}</span>
            </div>

            <div class="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{{ formatCurrency(selectedGrandTotal) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No invoice selected for {{ selectedConfiguration?.name || 'this configuration' }}.
      </div>
    </template>
  </section>
</template>

<style scoped>
.line-item-list {
  position: relative;
}

.line-item-list-move,
.line-item-list-enter-active,
.line-item-list-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.line-item-list-enter-from,
.line-item-list-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

.line-item-list-leave-active {
  position: absolute;
  inset-inline: 0;
}
</style>
