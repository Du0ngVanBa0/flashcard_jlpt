import { useEffect, useState } from 'react'
import {
  IconArrowsShuffle,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import './App.css'

type StudyCard = {
  id: string
  deck: string
  section: string
  symbol: string
  romaji: string
  hint: string
  detail: string
}

const DATA_URLS = [
  `${import.meta.env.BASE_URL}data/kana.txt`,
  `${import.meta.env.BASE_URL}data/numbers.txt`,
]

const deckMeta = {
  hiragana: {
    label: 'Hiragana',
    description: 'Bang mem de doc va viet tu vung co ban.',
    itemLabel: 'ky tu',
  },
  katakana: {
    label: 'Katakana',
    description: 'Bang cung thuong dung cho tu muon va ten rieng.',
    itemLabel: 'ky tu',
  },
  numbers: {
    label: 'Dem so',
    description: 'So dem N5 tu 0 den 10000 cung quy tac doc hay gap.',
    itemLabel: 'muc',
  },
} as const

const sectionLabels: Record<string, string> = {
  basic: 'Co ban',
  dakuten: 'Dakuten',
  combo: 'Am ghep',
  compound: 'Ghep so',
  large: 'So lon',
  rule: 'Quy tac doc',
}

function shuffleArray<T>(items: T[]) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function parseStudyData(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim())
      const [deck, section, symbol, romaji, hint, ...detailParts] = parts

      return {
        id: `${deck}-${section}-${symbol}`,
        deck,
        section,
        symbol,
        romaji,
        hint,
        detail: detailParts.join('|'),
      } satisfies StudyCard
    })
}

function getStudySections(cards: StudyCard[], deck: string) {
  return Array.from(
    new Set(
      cards
        .filter((card) => card.deck === deck && card.section !== 'rule')
        .map((card) => card.section),
    ),
  )
}

function getStudyCards(cards: StudyCard[], deck: string, sections: string[]) {
  return cards.filter(
    (card) => card.deck === deck && sections.includes(card.section),
  )
}

function App() {
  const [cards, setCards] = useState<StudyCard[]>([])
  const [selectedDeck, setSelectedDeck] = useState('hiragana')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [deckOrder, setDeckOrder] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [selectedDetailId, setSelectedDetailId] = useState('')
  const [viewMode, setViewMode] = useState<'study' | 'rule'>('study')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadData() {
      try {
        const responses = await Promise.all(DATA_URLS.map((url) => fetch(url)))
        const failedResponse = responses.find((response) => !response.ok)

        if (failedResponse) {
          throw new Error(`Khong doc duoc du lieu: ${failedResponse.status}`)
        }

        const rawFiles = await Promise.all(
          responses.map((response) => response.text()),
        )

        if (!isActive) {
          return
        }

        const parsedCards = rawFiles.flatMap((raw) => parseStudyData(raw))
        const initialDeck = parsedCards[0]?.deck ?? 'hiragana'
        const initialSections = getStudySections(parsedCards, initialDeck)
        const initialVisibleCards = getStudyCards(
          parsedCards,
          initialDeck,
          initialSections,
        )

        setCards(parsedCards)
        setSelectedDeck(initialDeck)
        setSelectedSections(initialSections)
        setDeckOrder(shuffleArray(initialVisibleCards.map((card) => card.id)))
        setCurrentIndex(0)
        setIsRevealed(false)
        setSelectedDetailId('')
        setViewMode('study')
        setError('')
      } catch (loadError) {
        if (!isActive) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Khong the tai file du lieu'

        setError(message)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isActive = false
    }
  }, [])

  const deckOptions = (Object.keys(deckMeta) as string[]).filter((deck) =>
    cards.some((card) => card.deck === deck),
  )
  const activeDeck = deckOptions.includes(selectedDeck)
    ? selectedDeck
    : deckOptions[0] ?? 'hiragana'
  const activeDeckMeta = deckMeta[activeDeck as keyof typeof deckMeta]
  const deckCards = cards.filter((card) => card.deck === activeDeck)
  const studySectionOptions = getStudySections(cards, activeDeck)
  const selectedStudySections = selectedSections.filter((section) =>
    studySectionOptions.includes(section),
  )
  const ruleCards = deckCards.filter((card) => card.section === 'rule')
  const isNumbersDeck = activeDeck === 'numbers'
  const isRuleSection = viewMode === 'rule'
  const visibleCards = isRuleSection
    ? ruleCards
    : getStudyCards(cards, activeDeck, selectedStudySections)
  const isListMode = isRuleSection || isNumbersDeck
  const detailCards = isRuleSection ? ruleCards : visibleCards
  const activeDetailId = detailCards.some((card) => card.id === selectedDetailId)
    ? selectedDetailId
    : detailCards[0]?.id ?? ''
  const activeDetail =
    detailCards.find((card) => card.id === activeDetailId) ?? detailCards[0] ?? null

  const currentCardId = deckOrder[currentIndex]
  const currentCard =
    visibleCards.find((card) => card.id === currentCardId) ?? visibleCards[0] ?? null

  function resetDeck(nextCards: StudyCard[]) {
    setDeckOrder(shuffleArray(nextCards.map((card) => card.id)))
    setCurrentIndex(0)
    setIsRevealed(false)
  }

  function handleSelectDeck(deck: string) {
    const nextSections = getStudySections(cards, deck)

    setSelectedDeck(deck)
    setSelectedSections(nextSections)
    setSelectedDetailId('')
    setViewMode('study')
    resetDeck(getStudyCards(cards, deck, nextSections))
  }

  function handleToggleSection(section: string) {
    const nextSections = selectedStudySections.includes(section)
      ? selectedStudySections.filter((value) => value !== section)
      : [...selectedStudySections, section]
    const nextCards = getStudyCards(cards, activeDeck, nextSections)

    setSelectedSections(nextSections)
    setSelectedDetailId(nextSections.length > 0 ? nextCards[0]?.id ?? '' : '')
    setViewMode('study')
    resetDeck(nextCards)
  }

  function handleOpenRuleMode() {
    setSelectedDetailId(ruleCards[0]?.id ?? '')
    setIsRevealed(false)
    setViewMode('rule')
  }

  function handleRevealCard() {
    if (!currentCard) {
      return
    }

    setIsRevealed((value) => !value)
  }

  function handleNextCard() {
    if (deckOrder.length === 0) {
      return
    }

    setCurrentIndex((value) => (value + 1) % deckOrder.length)
    setIsRevealed(false)
  }

  function handlePrevCard() {
    if (deckOrder.length === 0) {
      return
    }

    setCurrentIndex((value) => (value - 1 + deckOrder.length) % deckOrder.length)
    setIsRevealed(false)
  }

  function handleReshuffleCards() {
    resetDeck(visibleCards)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        if (isListMode || !currentCard) {
          return
        }

        setIsRevealed((value) => !value)
      }

      if (event.code === 'ArrowRight' || event.code === 'Enter') {
        event.preventDefault()

        if (isListMode || deckOrder.length === 0) {
          return
        }

        setCurrentIndex((value) => (value + 1) % deckOrder.length)
        setIsRevealed(false)
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault()

        if (isListMode || deckOrder.length === 0) {
          return
        }

        setCurrentIndex((value) => (value - 1 + deckOrder.length) % deckOrder.length)
        setIsRevealed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentCard, deckOrder.length, isListMode])

  const progress = deckOrder.length === 0 ? 0 : currentIndex + 1

  return (
    <main className="app-shell">
      <header className="top-header">
        <div className="top-header-copy">
          <p className="panel-label">JLPT N5 Study</p>
          <h1>{activeDeckMeta?.label ?? activeDeck}</h1>
          <p className="reference-note">{activeDeckMeta?.description}</p>
        </div>
        <nav className="header-tabs" aria-label="Chon bai hoc">
          {deckOptions.map((deck) => (
            <button
              key={deck}
              type="button"
              className={deck === activeDeck ? 'header-tab is-active' : 'header-tab'}
              onClick={() => handleSelectDeck(deck)}
            >
              {deckMeta[deck as keyof typeof deckMeta]?.label ?? deck}
            </button>
          ))}
        </nav>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-block">
            <p className="panel-label">Bai dang hoc</p>
            <p className="reference-note">{activeDeckMeta?.description}</p>
          </div>

          <div className="panel-block">
            <p className="panel-label">Nhom hoc</p>
            <div className="chip-list">
              {studySectionOptions.map((section) => (
                <button
                  key={section}
                  type="button"
                  className={
                    selectedStudySections.includes(section) ? 'chip is-active' : 'chip'
                  }
                  onClick={() => handleToggleSection(section)}
                >
                  {sectionLabels[section] ?? section}
                </button>
              ))}
            </div>
          </div>

          {ruleCards.length > 0 ? (
            <div className="panel-block">
              <p className="panel-label">Tai lieu doc</p>
              <div className="chip-list">
                <button
                  type="button"
                  className={isRuleSection ? 'chip is-active' : 'chip'}
                  onClick={handleOpenRuleMode}
                >
                  {sectionLabels.rule}
                </button>
              </div>
            </div>
          ) : null}

          <div className="panel-block panel-block--muted">
            <p className="panel-label">Phim tat</p>
            <ul className="shortcut-list">
              <li>
                <kbd>Space</kbd> Lat the
              </li>
              <li>
                <kbd>Enter</kbd> hoac <kbd>→</kbd> Sang the tiep
              </li>
              <li>
                <kbd>←</kbd> Quay lai the truoc
              </li>
              {isListMode ? (
                <li>
                  <kbd>Tap</kbd> Chon mot muc de xem giai thich
                </li>
              ) : null}
            </ul>
          </div>
        </aside>

        <section className="flashcard-panel">
          {loading ? (
            <div className="status-card">Dang doc file du lieu...</div>
          ) : error ? (
            <div className="status-card status-card--error">{error}</div>
          ) : isListMode && detailCards.length === 0 ? (
            <div className="status-card">
              Chon it nhat mot nhom de xem cach doc va vi du chi tiet.
            </div>
          ) : isListMode ? (
            <div className="rule-panel">
              <div className="flashcard-header">
                <div>
                  <p className="panel-label">{activeDeckMeta?.label}</p>
                  <h2>{isNumbersDeck ? 'Hoc cach doc so N5' : 'Quy tac doc N5'}</h2>
                </div>
                <span className="progress-pill">{detailCards.length} muc</span>
              </div>

              <div className="rule-layout">
                <div className="rule-list">
                  {detailCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={
                        card.id === activeDetailId
                          ? 'rule-list-item is-active'
                          : 'rule-list-item'
                      }
                      onClick={() => setSelectedDetailId(card.id)}
                    >
                      <strong>{card.symbol}</strong>
                      <span>{card.romaji}</span>
                      <small>{sectionLabels[card.section] ?? card.section}</small>
                    </button>
                  ))}
                </div>

                {activeDetail ? (
                  <article className="rule-detail-card">
                    <p className="panel-label">
                      {sectionLabels[activeDetail.section] ?? activeDetail.section}
                    </p>
                    <h3>{activeDetail.symbol}</h3>
                    <p className="rule-detail-lead">{activeDetail.romaji}</p>
                    <p className="rule-detail-sublead">{activeDetail.hint}</p>
                    <div className="rule-detail-body">
                      {activeDetail.detail
                        .split(';;')
                        .filter(Boolean)
                        .map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                    </div>
                  </article>
                ) : null}
              </div>
            </div>
          ) : !currentCard ? (
            <div className="status-card">
              Chon it nhat mot nhom nhu Co ban, Dakuten, Am ghep hoac Ghep so de
              bat dau.
            </div>
          ) : (
            <>
              <div className="flashcard-header">
                <div>
                  <p className="panel-label">
                    {deckMeta[currentCard.deck as keyof typeof deckMeta]?.label ??
                      currentCard.deck}
                  </p>
                  <h2>
                    {sectionLabels[currentCard.section] ?? currentCard.section}
                  </h2>
                </div>
                <span className="progress-pill">
                  {progress}/{deckOrder.length}
                </span>
              </div>

              <button
                type="button"
                className={isRevealed ? 'flashcard is-revealed' : 'flashcard'}
                onClick={handleRevealCard}
              >
                <span className="flashcard-face flashcard-face--front">
                  <span className="kana-symbol">{currentCard.symbol}</span>
                  <span className="flashcard-tip">Bam de xem loi giai</span>
                </span>

                <span className="flashcard-face flashcard-face--back">
                  <span className="romaji">{currentCard.romaji}</span>
                  <span className="flashcard-meta">{currentCard.hint}</span>
                  {currentCard.detail ? (
                    <span className="flashcard-meta flashcard-meta--detail">
                      {currentCard.detail}
                    </span>
                  ) : null}
                  <span className="flashcard-meta">{currentCard.symbol}</span>
                </span>
              </button>

              <div className="action-row">
                <button
                  type="button"
                  className="icon-button"
                  onClick={handleRevealCard}
                  aria-label={isRevealed ? 'An dap an' : 'Xem dap an'}
                  title={isRevealed ? 'An dap an' : 'Xem dap an'}
                >
                  {isRevealed ? (
                    <IconEyeOff aria-hidden="true" stroke={1.8} />
                  ) : (
                    <IconEye aria-hidden="true" stroke={1.8} />
                  )}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={handleReshuffleCards}
                  aria-label="Xao lai"
                  title="Xao lai"
                >
                  <IconArrowsShuffle aria-hidden="true" stroke={1.8} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={handlePrevCard}
                  aria-label="The truoc"
                  title="The truoc"
                >
                  <IconChevronLeft aria-hidden="true" stroke={1.8} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--primary"
                  onClick={handleNextCard}
                  aria-label="The tiep theo"
                  title="The tiep theo"
                >
                  <IconChevronRight aria-hidden="true" stroke={1.8} />
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      {!isListMode ? (
        <section className="reference-panel">
          <div className="reference-header">
            <div>
              <p className="panel-label">{activeDeckMeta?.label ?? activeDeck}</p>
              <h2>
                {activeDeckMeta?.label ?? activeDeck} co {visibleCards.length}{' '}
                {activeDeckMeta?.itemLabel ?? 'muc'}
              </h2>
            </div>
            <p className="reference-note">
              Nguon du lieu: /public/data/kana.txt va /public/data/numbers.txt
            </p>
          </div>

          <div className="kana-grid">
            {visibleCards.map((card) => {
              const isCurrent = currentCard?.id === card.id

              return (
                <article
                  key={card.id}
                  className={isCurrent ? 'kana-item is-current' : 'kana-item'}
                >
                  <strong>{card.symbol}</strong>
                  <span>{card.romaji}</span>
                  <small>{sectionLabels[card.section] ?? card.section}</small>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default App
