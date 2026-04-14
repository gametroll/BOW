<script setup>
import { storeToRefs } from 'pinia'
import { useInvoiceStore } from '../stores/invoiceStore'

const invoiceStore = useInvoiceStore()

const { selectedConfiguration, stepCatalog } = storeToRefs(invoiceStore)

function getSchemaForStep(type) {
  return stepCatalog.value.find((step) => step.type === type)?.settingsSchema ?? []
}
</script>

<template>
  <section class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
    <section class="rounded-2xl bg-white p-6 shadow-sm">
      <div class="mb-6 border-b border-slate-200 pb-6">
        <h2 class="text-2xl font-bold">Configuration Editor</h2>
        <p class="mt-2 text-sm text-slate-600">
          Edit the selected billing configuration and customize the exact step order, naming, and settings.
        </p>
      </div>

      <template v-if="selectedConfiguration">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700">Configuration Name</span>
            <input
              :value="selectedConfiguration.name"
              type="text"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              @input="invoiceStore.updateSelectedConfigurationField('name', $event.target.value)"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700">Cadence</span>
            <select
              :value="selectedConfiguration.cadence"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              @change="invoiceStore.updateSelectedConfigurationField('cadence', $event.target.value)"
            >
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Ad hoc</option>
            </select>
          </label>
        </div>

        <label class="mt-4 block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Description</span>
          <textarea
            :value="selectedConfiguration.description"
            rows="3"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            @input="invoiceStore.updateSelectedConfigurationField('description', $event.target.value)"
          />
        </label>

        <div class="mt-6 rounded-xl border border-slate-200 p-4">
          <div class="mb-4">
            <h3 class="text-lg font-semibold">Run Schedule</h3>
            <p class="mt-1 text-sm text-slate-600">
              Choose whether this configuration runs manually or on a schedule within the billing period.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">Run Mode</span>
              <select
                :value="selectedConfiguration.runSchedule.mode"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                @change="
                  invoiceStore.updateSelectedConfigurationScheduleField('mode', $event.target.value)
                "
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">Day of Period</span>
              <input
                :value="selectedConfiguration.runSchedule.dayOfPeriod"
                type="number"
                min="1"
                max="28"
                :disabled="selectedConfiguration.runSchedule.mode !== 'scheduled'"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none disabled:bg-slate-100 focus:border-slate-900"
                @input="
                  invoiceStore.updateSelectedConfigurationScheduleField('dayOfPeriod', $event.target.value)
                "
              />
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">Run Time</span>
              <input
                :value="selectedConfiguration.runSchedule.timeOfDay"
                type="time"
                :disabled="selectedConfiguration.runSchedule.mode !== 'scheduled'"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none disabled:bg-slate-100 focus:border-slate-900"
                @input="
                  invoiceStore.updateSelectedConfigurationScheduleField('timeOfDay', $event.target.value)
                "
              />
            </label>
          </div>

          <div
            v-if="selectedConfiguration.runSchedule.demoScheduledAt"
            class="mt-4 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900"
          >
            Demo note: this configuration also has a page-load-relative scheduled time so it can automatically run during demos.
          </div>
        </div>

        <div class="mt-6">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Billing Steps</h3>
            <span class="text-sm text-slate-500">
              {{ selectedConfiguration.steps.length }} step(s)
            </span>
          </div>

          <div class="space-y-4">
            <div
              v-for="(step, index) in selectedConfiguration.steps"
              :key="step.id"
              class="rounded-xl border border-slate-200 p-4"
            >
              <div class="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                <div class="flex items-start gap-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {{ index + 1 }}
                  </span>
                  <div>
                    <p class="text-xs uppercase tracking-tight text-slate-500">{{ step.type }}</p>
                    <h4 class="font-semibold text-slate-900">{{ step.name }}</h4>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                    @click="invoiceStore.moveSelectedConfigurationStep(step.id, 'up')"
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                    @click="invoiceStore.moveSelectedConfigurationStep(step.id, 'down')"
                  >
                    Move Down
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                    @click="
                      invoiceStore.updateSelectedConfigurationStepField(step.id, 'enabled', !step.enabled)
                    "
                  >
                    {{ step.enabled ? 'Disable' : 'Enable' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                    @click="invoiceStore.removeSelectedConfigurationStep(step.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="block">
                  <span class="mb-1 block text-sm font-medium text-slate-700">Step Name</span>
                  <input
                    :value="step.name"
                    type="text"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                    @input="
                      invoiceStore.updateSelectedConfigurationStepField(step.id, 'name', $event.target.value)
                    "
                  />
                </label>

                <label class="block">
                  <span class="mb-1 block text-sm font-medium text-slate-700">Enabled</span>
                  <select
                    :value="String(step.enabled)"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                    @change="
                      invoiceStore.updateSelectedConfigurationStepField(
                        step.id,
                        'enabled',
                        $event.target.value === 'true',
                      )
                    "
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </label>
              </div>

              <label class="mt-4 block">
                <span class="mb-1 block text-sm font-medium text-slate-700">Step Description</span>
                <textarea
                  :value="step.description"
                  rows="2"
                  class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                  @input="
                    invoiceStore.updateSelectedConfigurationStepField(
                      step.id,
                      'description',
                      $event.target.value,
                    )
                  "
                />
              </label>

              <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label
                  v-for="field in getSchemaForStep(step.type)"
                  :key="`${step.id}-${field.key}`"
                  class="block"
                >
                  <span class="mb-1 block text-sm font-medium text-slate-700">{{ field.label }}</span>

                  <input
                    v-if="field.type === 'text'"
                    :value="step.settings[field.key]"
                    type="text"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                    @input="
                      invoiceStore.updateSelectedConfigurationStepSetting(
                        step.id,
                        field.key,
                        $event.target.value,
                      )
                    "
                  />

                  <select
                    v-else
                    :value="step.settings[field.key]"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                    @change="
                      invoiceStore.updateSelectedConfigurationStepSetting(
                        step.id,
                        field.key,
                        $event.target.value,
                      )
                    "
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>

    <aside class="rounded-2xl bg-white p-6 shadow-sm">
      <h3 class="text-lg font-semibold">Available Step Types</h3>
      <p class="mt-2 text-sm text-slate-600">
        Add new steps to the selected configuration from this catalog.
      </p>

      <div class="mt-6 space-y-3">
        <div
          v-for="catalogStep in stepCatalog"
          :key="catalogStep.type"
          class="rounded-xl border border-slate-200 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h4 class="font-semibold text-slate-900">{{ catalogStep.label }}</h4>
              <p class="mt-1 text-sm text-slate-600">{{ catalogStep.description }}</p>
            </div>

            <button
              type="button"
              class="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              @click="invoiceStore.addStepToSelectedConfiguration(catalogStep.type)"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </aside>
  </section>
</template>
