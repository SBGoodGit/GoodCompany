// One "How it works" popup for the whole app (step A). Pages open their own entry; ⓘ icons open a topic.
import { PAGE_HELP, TOPIC_HELP, type HelpEntry } from '~~/shared/help'

export function useHelp() {
  const current = useState<HelpEntry | null>('help', () => null)
  return {
    current,
    openPage: (routeName: string) => { current.value = PAGE_HELP[routeName] ?? null },
    openTopic: (topic: string) => { current.value = TOPIC_HELP[topic] ?? null },
    close: () => { current.value = null },
  }
}
