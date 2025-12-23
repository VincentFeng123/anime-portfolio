'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import './experience.css'

const expEntries = [
  {
    numeral: 'I',
    title: 'Heaventree',
    subtitle: 'HLN SILINK-DIR ✦ ENDRI ARENA',
    description: [
      'The tree-like crystals that are scattered throughout the land. They were regarded by the ancestors as gifts from heaven and thus received the name "Heaventree."',
      'On each Heaventree grow fruit-like crystals shining as bright as the moon, which are known as "Phoxene."',
      'The Heaventrees have already existed in human society ever since the dawn of mankind. Afterwards, worshippers of the Heaventrees established their religion, while alchemists became obsessed with studying Phoxene, which eventually yielded the incredible Phoxichor Technology...',
      'The scholars of the Elysian Church once remarked, "The history of Atlasia is the history of the Heaventrees," which is in no way an exaggeration.'
    ],
    image: '/about-reference.png'
  },
  {
    numeral: 'II',
    title: 'Originium',
    subtitle: 'CORE MATERIAL ✦ ENERGY SOURCE',
    description: [
      'A mysterious crystalline substance found across the land, Originium is both a blessing and a curse to civilization.',
      'Its immense energy potential has powered cities and technologies beyond imagination.',
      'Yet exposure to Originium carries grave risks—the infected bear its mark, their bodies slowly crystallizing.',
      'The study of Originium Arts has become both science and art, wielded by operators in defense of the innocent.'
    ],
    image: '/peakpx.jpg'
  },
  {
    numeral: 'III',
    title: 'Rhodes Island',
    subtitle: 'PHARMACEUTICAL ✦ OPERATIONS',
    description: [
      'A pharmaceutical company on the surface, Rhodes Island serves a greater purpose in the shadows.',
      'Founded to combat Oripathy, it has grown into a mobile fortress housing operators from across Terra.',
      'The landship traverses the wastes, offering aid to the afflicted while battling threats that endanger all.',
      'Under the Doctor\'s guidance, Rhodes Island stands as a beacon of hope in troubled times.'
    ],
    image: '/anime-style-mythical-dragon-creature.jpg'
  },
  {
    numeral: 'IV',
    title: 'Talos-II',
    subtitle: 'FRONTIER BASE ✦ NEW HORIZON',
    description: [
      'The great mountain ranges, crisscrossing river systems, and rich vegetation cover gave rise to a rather resilient biosphere.',
      'Talos-II represents humanity\'s latest venture into the unknown frontier.',
      'Established as a forward operating base, it serves as the launching point for expeditions into uncharted territory.',
      'The settlement grows daily, attracting pioneers seeking fortune and discovery in equal measure.'
    ],
    image: '/anime-style-mythical-dragon-creature.png'
  },
  {
    numeral: 'V',
    title: 'Endfield',
    subtitle: 'PROTOCOL ✦ INITIATIVE',
    description: [
      'The Endfield Protocol was established to coordinate humanity\'s expansion across the new frontier.',
      'Operating under strict guidelines, Endfield teams are deployed to investigate anomalies and secure resources.',
      'Each operative undergoes rigorous training, prepared for the unknown dangers that await.',
      'The initiative represents our best hope for understanding this strange new world we call home.'
    ],
    image: '/about-reference.png'
  }
]


export default function ExperiencePage() {
  const params = useParams()
  const router = useRouter()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [displayIdx, setDisplayIdx] = useState(0)
  const [fadeIn, setFadeIn] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'none' | 'left' | 'right' | 'entering-left' | 'entering-right'>('none')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const id = parseInt(params.id as string, 10)
    if (!isNaN(id) && id >= 0 && id < expEntries.length) {
      setCurrentIdx(id)
      setDisplayIdx(id)
    }
    // Trigger fade in
    setTimeout(() => setFadeIn(true), 50)
  }, [params.id])

  const entry = expEntries[displayIdx]

  const goToPrev = () => {
    if (isTransitioning) return

    const newIdx = (currentIdx - 1 + expEntries.length) % expEntries.length
    setIsTransitioning(true)
    setSlideDirection('right') // Content slides right (prev comes from left)

    // Clear any existing timeout
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current)

    // After slide out animation, update content and slide in
    transitionTimeout.current = setTimeout(() => {
      setDisplayIdx(newIdx)
      setCurrentIdx(newIdx)
      setSlideDirection('entering-right')

      // Reset after slide in
      transitionTimeout.current = setTimeout(() => {
        setSlideDirection('none')
        setIsTransitioning(false)
      }, 500)
    }, 400)
  }

  const goToNext = () => {
    if (isTransitioning) return

    const newIdx = (currentIdx + 1) % expEntries.length
    setIsTransitioning(true)
    setSlideDirection('left') // Content slides left (next comes from right)

    // Clear any existing timeout
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current)

    // After slide out animation, update content and slide in
    transitionTimeout.current = setTimeout(() => {
      setDisplayIdx(newIdx)
      setCurrentIdx(newIdx)
      setSlideDirection('entering-left')

      // Reset after slide in
      transitionTimeout.current = setTimeout(() => {
        setSlideDirection('none')
        setIsTransitioning(false)
      }, 500)
    }, 400)
  }

  const goBack = () => {
    router.push('/?section=3')
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current)
    }
  }, [])

  return (
    <div className={`exp-page ${fadeIn ? 'fade-in' : ''}`}>
      {/* Return Button */}
      <button className="exp-return-btn" onClick={goBack}>
        <span className="exp-return-arrow">‹</span>
        <span>Return</span>
      </button>

      {/* Left Arrow */}
      <button className="exp-arrow exp-arrow-left" onClick={goToPrev}>
        <span className="exp-arrow-icon">‹</span>
        <span className="exp-arrow-line" />
        <span className="exp-arrow-dot" />
      </button>

      {/* Right Arrow */}
      <button className="exp-arrow exp-arrow-right" onClick={goToNext}>
        <span className="exp-arrow-dot" />
        <span className="exp-arrow-line" />
        <span className="exp-arrow-icon">›</span>
      </button>

      {/* Main Content */}
      <div className={`exp-content ${slideDirection !== 'none' ? `slide-${slideDirection}` : ''}`}>
        {/* Left - Emblem */}
        <div className="exp-emblem-container">
          <div className="exp-emblem">
            <div className="exp-emblem-outer-frame" />
            <div className="exp-emblem-inner-frame" />
            <img src={entry.image} alt={entry.title} />
            <div className="exp-emblem-glow" />
          </div>
        </div>

        {/* Right - Text */}
        <div className="exp-text">
          <div className="exp-numeral-container">
            <span className="exp-numeral-line left" />
            <span className="exp-numeral">{entry.numeral}</span>
            <span className="exp-numeral-line right" />
          </div>

          <h1 className="exp-title">{entry.title}</h1>

          <div className="exp-subtitle">
            <span>{entry.subtitle}</span>
          </div>

          <div className="exp-description">
            {entry.description.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="exp-bottom-line" />

      {/* Decorative elements */}
      <div className="exp-corner-decor top-left" />
      <div className="exp-corner-decor bottom-right" />
    </div>
  )
}
