import { Assets } from 'premid'

const presence = new Presence({
  clientId: '1143161714293080104',
})

enum ActivityAssets {
  Logo = 'https://cdn.rcd.gg/PreMiD/websites/S/StreamingCommunity/assets/logo.png',
}

async function getStrings() {
  return presence.getStrings(
    {
      paused: 'general.paused',
      play: 'general.playing',
      search: 'general.searchFor',
      viewCategory: 'general.viewCategory',
      viewHome: 'general.viewHome',
      viewShow: 'general.viewShow',
    },
    await presence.getSetting<string>('lang').catch(() => 'en'),
  )
}

let strings: Awaited<ReturnType<typeof getStrings>>
let oldLang: string | null = null
let current: number
let duration: number
let paused: boolean

presence.on(
  'iFrameData',
  (data: unknown) => {
    ({ current, duration, paused } = data as { current: number, duration: number, paused: boolean })
  },
)

presence.on('UpdateData', async () => {
  const presenceData: PresenceData = {
    largeImageKey: ActivityAssets.Logo,
  }
  const [newLang, cover] = await Promise.all([
    presence.getSetting<string>('lang').catch(() => 'en'),
    presence.getSetting<boolean>('cover'),
  ])
  const { pathname } = document.location

  if (oldLang !== newLang || !strings) {
    oldLang = newLang
    strings = await getStrings()
  }
  if (pathname === '/') {
    presenceData.details = strings.viewHome
  }
  else if (pathname.startsWith('/search')) {
    presenceData.smallImageKey = Assets.Search
    presenceData.details = `${strings.search} ${
      document.querySelector<HTMLInputElement>('.search-input > input')?.value
    }`
  }
  else if (pathname.startsWith('/titles')) {
    presenceData.smallImageKey = Assets.Viewing
    presenceData.smallImageText = strings.viewShow
    presenceData.details = `${strings.viewShow} ${pathname
      .replace(/\/titles\/\d+/g, '')
      .replaceAll('-', ' ')}`
    presenceData.largeImageKey = cover
      ? document.querySelector<HTMLSourceElement>(
        '.background-image-loader > source',
      )?.srcset ?? ActivityAssets.Logo
      : ActivityAssets.Logo
  }
  else if (pathname.startsWith('/watch')) {
    delete presenceData.startTimestamp
    presenceData.smallImageKey = paused ? Assets.Pause : Assets.Play
    presenceData.smallImageText = paused ? strings.paused : strings.play
    presenceData.details = `${strings.play} ${document
      .querySelector('title')
      ?.textContent
      ?.replace('- StreamingCommunity', '')
      ?.replace('Watch', '')}`
    if (!Number.isNaN(duration) && !paused) {
      [presenceData.startTimestamp, presenceData.endTimestamp] = presence.getTimestamps(current, duration)
    }
  }
  else if (pathname.startsWith('/serie-tv')) {
    presenceData.details = `${strings.viewCategory} tv series`
  }
  else if (pathname.startsWith('/film')) {
    presenceData.details = `${strings.viewCategory} movie`
  }

  presence.setActivity(presenceData)
})
