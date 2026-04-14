<script setup>
import { computed } from 'vue'
import { useInvoiceStore } from '../stores/invoiceStore'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const invoiceStore = useInvoiceStore()

/**
 * Calculates the current line total for display.
 */
const lineTotal = computed(() => {
  return Number(props.item.quantity || 0) * Number(props.item.price || 0)
})

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
  <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_120px_140px_120px_48px] md:items-end">
    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">Description</span>
      <input
        :value="item.description"
        type="text"
        class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        @input="invoiceStore.updateLineItem(item.id, 'description', $event.target.value)"
      />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">Qty</span>
      <input
        :value="item.quantity"
        type="number"
        min="0"
        class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        @input="invoiceStore.updateLineItem(item.id, 'quantity', $event.target.value)"
      />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">Unit Price</span>
      <input
        :value="item.price"
        type="number"
        min="0"
        step="0.01"
        class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        @input="invoiceStore.updateLineItem(item.id, 'price', $event.target.value)"
      />
    </label>

    <div>
      <span class="mb-1 block text-sm font-medium text-slate-700">Line Total</span>
      <div class="rounded-xl bg-slate-100 px-3 py-2 font-medium">
        {{ formatCurrency(lineTotal) }}
      </div>
    </div>

    <button
      type="button"
      class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
      @click="invoiceStore.removeLineItem(item.id)"
    >
      ✕
    </button>
  </div>
</template>