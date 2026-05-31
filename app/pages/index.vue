<script setup lang="ts">
const heroShields = [
  '/escudos/mexico.png',
  '/escudos/argentina.png',
  '/escudos/brasil.png',
  '/escudos/espana.png',
  '/escudos/francia.png',
  '/escudos/alemania.png',
  '/escudos/portugal.png',
  '/escudos/japon.png'
]

const highlights = [
  {
    icon: 'i-lucide-users-round',
    label: 'Participación abierta',
    value: 'Entran todos los que quieran jugar'
  },
  {
    icon: 'i-lucide-list-checks',
    label: 'Pronóstico por partido',
    value: 'Marcadores antes del silbatazo inicial'
  },
  {
    icon: 'i-lucide-trophy',
    label: 'Ranking general',
    value: 'Una sola tabla para todos los participantes'
  }
]

const scoringRules = [
  '1 punto por acertar ganador o empate',
  '1 punto extra por marcador exacto',
  'En fase de grupos el máximo es 2 puntos por partido',
  'Desde dieciseisavos puedes sumar hasta 6 puntos',
  'Eliminatorias: 2 puntos por 90 minutos, 2 por extra y 2 por penales cuando apliquen',
  'Los resultados parciales solo son informativos'
]
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden border-b border-default bg-[#0f5132] text-white">
      <div class="absolute inset-0 opacity-15">
        <img
          v-for="(shield, index) in heroShields"
          :key="shield"
          :src="shield"
          alt=""
          class="absolute size-20 object-contain sm:size-24"
          :class="[
            index === 0 && 'left-[6%] top-10 rotate-[-10deg]',
            index === 1 && 'right-[12%] top-12 rotate-[12deg]',
            index === 2 && 'bottom-12 left-[18%] rotate-[8deg]',
            index === 3 && 'bottom-20 right-[22%] rotate-[-7deg]',
            index === 4 && 'left-[42%] top-6 rotate-[5deg]',
            index === 5 && 'bottom-6 right-[6%] rotate-[10deg]',
            index === 6 && 'bottom-8 left-[4%] rotate-[-14deg]',
            index === 7 && 'right-[38%] top-28 rotate-[-4deg]'
          ]"
        >
      </div>

      <UContainer class="relative py-14 sm:py-18 lg:py-20">
        <div class="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div class="space-y-7">
            <div class="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Mundial FIFA 2026"
                class="size-16 rounded-md bg-white/90 object-contain p-1"
              >
              <UBadge
                icon="i-lucide-calendar-days"
                label="Mundial FIFA 2026"
                color="neutral"
                variant="solid"
              />
            </div>

            <div class="space-y-4">
              <h1 class="max-w-4xl text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
                Quiniela mundialista para jugar partido a partido.
              </h1>
              <p class="max-w-2xl text-lg text-white/85">
                Arma tus marcadores, compite en el ranking general y sigue el torneo desde fase de grupos hasta la final.
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <UButton
                to="/login"
                icon="i-lucide-log-in"
                label="Entrar a la quiniela"
                size="lg"
                color="neutral"
              />
              <UButton
                to="/ranking"
                icon="i-lucide-trophy"
                label="Ver ranking"
                size="lg"
                color="neutral"
                variant="subtle"
              />
            </div>
          </div>

          <div class="rounded-md border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur">
            <p class="text-sm font-medium text-white/80">
              Lo que se juega
            </p>
            <div class="mt-4 space-y-4">
              <div
                v-for="item in highlights"
                :key="item.label"
                class="flex gap-3"
              >
                <span class="grid size-10 shrink-0 place-items-center rounded-md bg-white text-[#0f5132]">
                  <UIcon
                    :name="item.icon"
                    class="size-5"
                  />
                </span>
                <div>
                  <p class="font-semibold text-white">
                    {{ item.label }}
                  </p>
                  <p class="text-sm text-white/75">
                    {{ item.value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <UContainer class="py-10">
      <div class="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section class="space-y-4">
          <div class="space-y-2">
            <UBadge
              icon="i-lucide-sparkles"
              label="Cómo funciona"
              variant="subtle"
            />
            <h2 class="text-2xl font-semibold text-highlighted">
              Participa fácil, compite todo el torneo.
            </h2>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-md border border-default p-4">
              <UIcon
                name="i-lucide-user-plus"
                class="size-6 text-primary"
              />
              <p class="mt-3 font-medium text-highlighted">
                Crea tu acceso
              </p>
              <p class="mt-1 text-sm text-muted">
                El administrador te registra como participante.
              </p>
            </div>
            <div class="rounded-md border border-default p-4">
              <UIcon
                name="i-lucide-pencil-line"
                class="size-6 text-primary"
              />
              <p class="mt-3 font-medium text-highlighted">
                Pronostica
              </p>
              <p class="mt-1 text-sm text-muted">
                Captura marcadores antes de que inicie cada partido.
              </p>
            </div>
            <div class="rounded-md border border-default p-4">
              <UIcon
                name="i-lucide-medal"
                class="size-6 text-primary"
              />
              <p class="mt-3 font-medium text-highlighted">
                Sube en la tabla
              </p>
              <p class="mt-1 text-sm text-muted">
                Acumula puntos conforme se capturan resultados finales.
              </p>
            </div>
          </div>
        </section>

        <aside class="rounded-md border border-default p-5">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-calculator"
              class="size-5 text-primary"
            />
            <h2 class="font-semibold text-highlighted">
              Sistema de puntos
            </h2>
          </div>

          <ul class="mt-4 space-y-3 text-sm text-muted">
            <li
              v-for="rule in scoringRules"
              :key="rule"
              class="flex gap-2"
            >
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 size-4 shrink-0 text-primary"
              />
              <span>{{ rule }}</span>
            </li>
          </ul>
        </aside>
      </div>
    </UContainer>
  </div>
</template>
