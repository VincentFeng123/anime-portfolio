'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { MouseEvent as ReactMouseEvent, CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleScene from './components/ParticleScene'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [navColor, setNavColor] = useState('#fff')
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hoverOffset, setHoverOffset] = useState({ x: 0, y: 0 })
  const [aboutIndex, setAboutIndex] = useState(0)
  const [aboutFade, setAboutFade] = useState(true)
  const [projectIdx, setProjectIdx] = useState(0)
  const [projectFade, setProjectFade] = useState(true)
  const [projectHover, setProjectHover] = useState<number | null>(null)
  const projectFadeTimeout = useRef<number | null>(null)
  const projectShowTimeout = useRef<number | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState(0)
  const [expHover, setExpHover] = useState<number | null>(null)
  const currentSectionRef = useRef(0)
  const navRef = useRef<HTMLDivElement | null>(null)
  const navItemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const aboutFadeTimeout = useRef<number | null>(null)
  const aboutShowTimeout = useRef<number | null>(null)
  const isScrolling = useRef(false)
  const lockStartTime = useRef(0)
  const totalSections = 5
  const SCROLL_COOLDOWN = 1500 // 1.5 second cooldown after scroll
  const completionTimeout = useRef<number | null>(null)
  const expandTimeout = useRef<number | null>(null)

  // Parallax character position variables
  const characterBaseX = 50
  const characterBaseY = 50
  const parallaxSensitivityX = 0.03
  const parallaxSensitivityY = 0.025
  const textTransformMultiplierX = 0.08
  const textTransformMultiplierY = 0.06
  const imageTransformMultiplierX = 0.15
  const imageTransformMultiplierY = 0.12
  const sectionTransition = 'transform 1.1s ease-in-out, opacity 1.1s ease-in-out'

  const slideStyle = (index: number) => {
    // For sections 0-3: horizontal sliding between each other
    // When section 4 is active, sections 0-3 slide UP
    if (currentSection === 4) {
      // All horizontal sections slide up when section 4 is active
      return {
        transform: `translate3d(${(index - 3) * 100}vw, -100vh, 0)`,
        transition: sectionTransition,
        willChange: 'transform, opacity'
      }
    }
    return {
      transform: `translate3d(${(index - currentSection) * 100}vw, 0, 0)`,
      transition: sectionTransition,
      willChange: 'transform, opacity'
    }
  }

  // Vertical slide style for experience detail (section 4)
  // Slides up from below when active, stays below when not
  const verticalSlideStyle = () => ({
    transform: `translate3d(0, ${currentSection === 4 ? 0 : 100}vh, 0)`,
    transition: sectionTransition,
    willChange: 'transform, opacity'
  })

  const goToExperience = (index: number) => {
    setSelectedExperience(index)
    currentSectionRef.current = 4
    setIsTransitioning(true)
    setCurrentSection(4)
    setTimeout(() => {
      setIsTransitioning(false)
    }, 1100)
  }

  const returnFromExperience = () => {
    currentSectionRef.current = 3
    setIsTransitioning(true)
    setCurrentSection(3)
    setTimeout(() => {
      setIsTransitioning(false)
    }, 1100)
  }

  // Handle section query parameter (for returning from experience page)
  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      const sectionNum = parseInt(section, 10)
      if (!isNaN(sectionNum) && sectionNum >= 0 && sectionNum < totalSections) {
        currentSectionRef.current = sectionNum
        setCurrentSection(sectionNum)
        // Clean up the URL
        router.replace('/', { scroll: false })
      }
    }
  }, [searchParams, router])

  useEffect(() => {
    const duration = 1400
    const start = performance.now()
    let frame: number

    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setLoadProgress(pct)
      if (pct >= 100) {
        if (!expandTimeout.current) {
          expandTimeout.current = window.setTimeout(() => setIsCompleting(true), 200)
        }
        if (!completionTimeout.current) {
          completionTimeout.current = window.setTimeout(() => setIsLoading(false), 850)
        }
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      if (completionTimeout.current) {
        clearTimeout(completionTimeout.current)
      }
      if (expandTimeout.current) {
        clearTimeout(expandTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      })
    }

    // SCROLL LOCK - instant response, 1 second cooldown
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      const now = Date.now()
      const timeSinceLastLock = now - lockStartTime.current

      // FIRST: Block if too soon since last scroll
      // This catches both locked state AND queued events right after unlock
      if (lockStartTime.current > 0 && timeSinceLastLock < SCROLL_COOLDOWN) {
        return
      }

      // Lock IMMEDIATELY and record the time
      isScrolling.current = true
      lockStartTime.current = now
      console.log('LOCK ENGAGED')

      // Determine direction
      const direction = e.deltaY > 0 ? 1 : -1
      const nextSection = currentSectionRef.current + direction

      // Check bounds - limit scroll to sections 0-3 (section 4 is click-only)
      // Also block scrolling when on section 4
      if (nextSection < 0 || nextSection > 3 || currentSectionRef.current === 4) {
        // Unlock immediately if out of bounds, reset timer
        isScrolling.current = false
        lockStartTime.current = 0
        return
      }

      console.log(`SCROLLING from ${currentSectionRef.current} to ${nextSection}`)

      // Update ref IMMEDIATELY
      currentSectionRef.current = nextSection

      // Start transition - fade out nav
      setIsTransitioning(true)

      // Move to next section
      setCurrentSection(nextSection)

      // Fade nav back in after transition completes
      setTimeout(() => {
        setIsTransitioning(false)
      }, 1100)

      // Unlock after cooldown
      setTimeout(() => {
        isScrolling.current = false
        console.log('UNLOCKED')
      }, SCROLL_COOLDOWN)
    }

    // Touch handling for mobile
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrolling.current) return

      const touchEndY = e.changedTouches[0].clientY
      const deltaY = touchStartY - touchEndY

      if (Math.abs(deltaY) < 30) return

      isScrolling.current = true

      const direction = deltaY > 0 ? 1 : -1
      const nextSection = currentSectionRef.current + direction

      // Limit touch scroll to sections 0-3, block when on section 4
      if (nextSection < 0 || nextSection > 3 || currentSectionRef.current === 4) {
        isScrolling.current = false
        return
      }

      currentSectionRef.current = nextSection
      setIsTransitioning(true)
      setCurrentSection(nextSection)

      setTimeout(() => {
        setIsTransitioning(false)
      }, 1100)

      setTimeout(() => {
        isScrolling.current = false
      }, 1000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const aboutEntries = [
    {
      title: 'About Talos-II',
      body: [
        'The great mountain ranges,',
        'crisscrossing river systems, and',
        'rich vegetation cover gave rise to',
        'a rather resilient biosphere.'
      ],
      image: '/about-reference.png'
    },
    {
      title: 'Logistics Hub',
      body: [
        'High-throughput transit bays,',
        'stacked cargo silos, and',
        'fully automated drone runs.',
        'Efficiency forged in steel.'
      ],
      image: '/anime-style-mythical-dragon-creature.jpg'
    },
    {
      title: 'Research Wing',
      body: [
        'Spectral analyzers humming,',
        'data walls alive with insight,',
        'teams iterating in quiet rhythm,',
        'breakthroughs born nightly.'
      ],
      image: '/peakpx.jpg'
    },
    {
      title: 'Perimeter',
      body: [
        'Tiered ramparts with panoramic view,',
        'sensor nets layered in the mist,',
        'calm under watchful eyes,',
        'safety in subtle orchestration.'
      ],
      image: '/anime-style-mythical-dragon-creature.png'
    }
  ]

  const projectEntries = [
    {
      name: 'Noctvoyager',
      titleTop: 'NOCT',
      titleBottom: 'VOYAGER',
      description:
        'Roving couriers navigating the frozen frontier, relaying intel across the archipelago in shadow and silence.',
      image: '/about-reference.png'
    },
    {
      name: 'Hyperborean Empire',
      titleTop: 'HYPER',
      titleBottom: 'BOREAN',
      description:
        'Imperial legions framed against auroras, siege engines humming, discipline carved into every march.',
      image: '/peakpx.jpg'
    },
    {
      name: 'The Elysian Church',
      titleTop: 'ELYSIAN',
      titleBottom: 'CHURCH',
      description:
        'Cathedrals of glass and steel, choirs harmonizing with turbines, faith and circuitry intertwined.',
      image: '/anime-style-mythical-dragon-creature.jpg'
    },
    {
      name: 'Republic of Luca',
      titleTop: 'REPUBLIC',
      titleBottom: 'LUCA',
      description:
        'Merchant fleets and debating halls, trade winds thick with voices, a republic steered by many hands.',
      image: '/anime-style-mythical-dragon-creature.png'
    },
    {
      name: 'No Affiliation',
      titleTop: 'NO AFF',
      titleBottom: 'ILIATION',
      description:
        'Free agents walking the liminal lines, unbound and observant, opportunists of the in-between.',
      image: '/about-reference.png'
    }
  ]

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

  const aboutIcons = ['/window.svg', '/globe.svg', '/file.svg', '/vercel.svg']
  const aboutTiles = aboutEntries.map((_, idx) => ({
    id: `0${idx + 1}`,
    icon: aboutIcons[idx % aboutIcons.length],
    active: aboutIndex === idx
  }))

  const handleProjectSelect = (idx: number) => {
    if (projectFadeTimeout.current) clearTimeout(projectFadeTimeout.current)
    if (projectShowTimeout.current) clearTimeout(projectShowTimeout.current)
    setProjectFade(false)
    projectFadeTimeout.current = window.setTimeout(() => {
      setProjectIdx(idx)
      projectShowTimeout.current = window.setTimeout(() => setProjectFade(true), 140)
    }, 220)
  }

  const handleExpChange = (direction: 'prev' | 'next') => {
    setSelectedExperience((prev) => {
      if (direction === 'prev') {
        return (prev - 1 + expEntries.length) % expEntries.length
      }
      return (prev + 1) % expEntries.length
    })
  }

  type ExpStrip = {
    id: string
    type: 'neutral' | 'image'
    color: string
    width: string
    minWidth: string
    height: string
    offset: number
    image?: string
  }

  const expStrips: ExpStrip[] = [
    {
      id: 'stripe-1',
      type: 'neutral' as const,
      color: '#000',
      width: '12vw',
      minWidth: '120px',
      height: '80%',
      offset: 0
    },
    {
      id: 'stripe-2',
      type: 'neutral' as const,
      color: '#000',
      width: '12vw',
      minWidth: '120px',
      height: '80%',
      offset: 0
    },
    {
      id: 'stripe-3',
      type: 'neutral' as const,
      color: '#000',
      width: '12vw',
      minWidth: '120px',
      height: '80%',
      offset: 0
    },
    {
      id: 'stripe-4',
      type: 'neutral' as const,
      color: '#000',
      width: '12vw',
      minWidth: '120px',
      height: '80%',
      offset: 0
    },
    {
      id: 'stripe-5',
      type: 'neutral' as const,
      color: '#000',
      width: '12vw',
      minWidth: '120px',
      height: '80%',
      offset: 0
    }
  ]

  const navItems = [
    { label: 'Hero', idx: 0, clip: 'polygon(12% 0, 100% 0, 88% 100%, 0 100%)' },
    { label: 'Card 1', idx: 1, clip: 'polygon(8% 0, 100% 12%, 88% 100%, 0 88%)' },
    { label: 'Card 2', idx: 2, clip: 'polygon(10% 0, 100% 0, 92% 100%, 0 90%)' },
    { label: 'Card 3', idx: 3, clip: 'polygon(6% 0, 100% 8%, 84% 100%, 0 92%)' }
  ]


  const goToSection = (index: number) => {
    if (index === currentSectionRef.current) return
    currentSectionRef.current = index
    setIsTransitioning(true)
    setCurrentSection(index)
    setTimeout(() => {
      setIsTransitioning(false)
    }, 1100)
  }

  useEffect(() => {
    // Hero (dark) uses light text, other sections use dark text
    setNavColor(currentSection === 0 ? '#fff' : '#000')
    // Reset hover state on section change to prevent jumpiness
    setHoverIdx(null)
    setHoverOffset({ x: 0, y: 0 })
  }, [currentSection])

  const handleNavMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (hoverIdx === null) return
    const btn = navItemRefs.current[hoverIdx]
    const navEl = navRef.current
    if (!btn || !navEl) return
    const btnRect = btn.getBoundingClientRect()
    const cx = btnRect.left + btnRect.width / 2
    const cy = btnRect.top + btnRect.height / 2
    const dx = Math.max(Math.min(e.clientX - cx, 3), -3)
    const dy = Math.max(Math.min(e.clientY - cy, 3), -3)
    setHoverOffset({ x: dx * 0.3, y: dy * 0.3 })
  }

  const handleAboutSelect = (idx: number) => {
    if (aboutFadeTimeout.current) clearTimeout(aboutFadeTimeout.current)
    if (aboutShowTimeout.current) clearTimeout(aboutShowTimeout.current)
    setAboutFade(false)
    aboutFadeTimeout.current = window.setTimeout(() => {
      setAboutIndex(idx)
      aboutShowTimeout.current = window.setTimeout(() => setAboutFade(true), 30)
    }, 180)
  }

  useEffect(() => {
    return () => {
      if (aboutFadeTimeout.current) clearTimeout(aboutFadeTimeout.current)
      if (aboutShowTimeout.current) clearTimeout(aboutShowTimeout.current)
      if (projectFadeTimeout.current) clearTimeout(projectFadeTimeout.current)
      if (projectShowTimeout.current) clearTimeout(projectShowTimeout.current)
    }
  }, [])

  return (
    <Suspense fallback={null}>
      <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loader-overlay-white"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          >
              <div className="loader-progress-assembly" aria-label="Loading progress">
              <motion.div
                className="loader-progress-track"
                role="presentation"
                initial={{ width: 10 }}
                animate={{ width: isCompleting ? '100vw' : 10 }}
                transition={{ duration: isCompleting ? 0.6 : 0.25, ease: 'easeInOut' }}
              >
                <motion.div
                  className="loader-progress-fill"
                  style={{ height: `${loadProgress}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${loadProgress}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </motion.div>
              <motion.div
                className="loader-progress-label"
                aria-live="polite"
                initial={{ top: '0%' }}
                animate={{ top: `${Math.min(Math.max(loadProgress, 0), 100)}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <span className="loader-percent">{loadProgress}%</span>
                <span className="loader-loading-text">Loading</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible backdrop-filter warm-up to prevent blur popping in */}
      <div className="backdrop-preload" aria-hidden />

      {/* Simple right sidenav */}
      <nav
        style={{
          position: 'fixed',
          top: '50%',
          right: '16px',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px 12px',
          alignItems: 'flex-end',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: navColor,
          background: 'transparent',
          zIndex: 1000000,
          pointerEvents: currentSection === 4 ? 'none' : 'auto',
          opacity: isTransitioning || currentSection === 4 ? 0 : 1,
          transition: 'opacity 0.4s ease-in-out'
        }}
        ref={navRef}
        onMouseMove={handleNavMouseMove}
        onMouseLeave={() => {
          setHoverIdx(null)
          setHoverOffset({ x: 0, y: 0 })
        }}
      >
        {navItems.map((item) => {
          const isActive = currentSection === item.idx
          const isHover = hoverIdx === item.idx
          const color = isActive || isHover ? '#fff' : navColor
          const background = isActive || isHover ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.08)'
          const slowTransition = (currentSection === 1 && item.idx === 2) || (currentSection === 2 && item.idx === 1)
          const delay =
            item.idx === 2 && isActive && hoverIdx === null && currentSection === 2
              ? '0.2s'
              : '0s'
          return (
          <button
            key={item.label}
            onClick={() => goToSection(item.idx)}
            style={{
              border: 'none',
              background,
              color,
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '12px',
              minWidth: '80px',
              textAlign: 'center',
              transitionProperty: 'color, background, transform',
              transitionDuration: slowTransition ? '0.8s' : '0.5s',
              transitionTimingFunction: 'ease',
              transitionDelay: delay,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              position: 'relative',
              clipPath: item.clip,
              WebkitClipPath: item.clip,
              transform: isHover ? `translate(${hoverOffset.x}px, ${hoverOffset.y}px)` : 'translate(0,0)'
            }}
            onMouseEnter={() => setHoverIdx(item.idx)}
            onMouseLeave={() => {
              setHoverIdx(null)
              setHoverOffset({ x: 0, y: 0 })
            }}
            ref={(el) => {
              navItemRefs.current[item.idx] = el
            }}
          >
            {item.label}
          </button>
        )})}
      </nav>

      {/* 3D Particle Scene */}
      <ParticleScene currentSection={currentSection} selectedExperience={selectedExperience} />

      <div className="min-h-screen w-full relative overflow-hidden">
        {/* Hero stack */}
        <div
          className="hero-slide"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 19,
            pointerEvents: currentSection === 0 ? 'auto' : 'none',
            opacity: Math.abs(currentSection - 0) <= 1 ? 1 : 0,
            ...slideStyle(0)
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url("/anime-dragon-character-illustration.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              width: '100%',
              height: '100%'
            }}
          />

          {/* Text Parallax Container */}
          <div
            className="absolute inset-0 z-5"
            style={{
              transform: `translate(${(mousePosition.x - 50) * textTransformMultiplierX}px, ${(mousePosition.y - 50) * textTransformMultiplierY}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out'
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <h1
                className="font-bold leading-tight tracking-wider select-none text-center"
                style={{
                  fontSize: '16vw',
                  color: 'rgba(0, 0, 0, 0.85)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'max-content',
                  lineHeight: '0.9',
                  zIndex: 1000001
                }}
              >
                VINCENT<br />FENG
              </h1>
            </div>
          </div>

          {/* Image Parallax Container */}
          <div
            className="absolute inset-0 z-10"
            style={{
              transform: `translate(${(mousePosition.x - 50) * imageTransformMultiplierX}px, ${(mousePosition.y - 50) * imageTransformMultiplierY}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out',
              zIndex: 2
            }}
          >
            <div
            className="absolute inset-0"
            style={{
                backgroundImage: 'url("/upscalemedia-transformed-5.png")',
                backgroundSize: 'cover',
                backgroundPosition: `${characterBaseX + (mousePosition.x - 50) * parallaxSensitivityX}% ${characterBaseY + (mousePosition.y - 50) * parallaxSensitivityY}%`,
                backgroundRepeat: 'no-repeat',
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.3))'
            }}
          />
        </div>
        </div>

        {/* Content Layer 1 */}
        <div
          className="fixed"
          style={{
            width: '100vw',
            height: '100vh',
            left: '0',
            top: '0',
            zIndex: 20,
            opacity: Math.abs(currentSection - 1) <= 1 ? 1 : 0,
            pointerEvents: currentSection === 1 ? 'auto' : 'none',
            ...slideStyle(1)
          }}
        >
          <div className="about-section">
            <div className="large-ghost" />
            <div className="about-ghost-heading" aria-hidden>GAME</div>
            <div className="relative z-10 max-w-6xl mx-auto">
              <div>
                <div className="about-label">
                  <span>ARkNIGHTS: ENDFIELD</span>
                  <span style={{ fontSize: '16px' }}>▸</span>
                </div>
                <div className="about-title">Gameplay</div>
              </div>

              <div className="about-divider">
                <div className="solid" />
                <div className="hatched" />
              </div>

              <div
                className="about-body"
                style={{
                  opacity: aboutFade ? 1 : 0,
                  transition: 'opacity 0.4s ease'
                }}
              >
                <div className="about-text-block">
                  <h2>{aboutEntries[aboutIndex].title}</h2>
                  <p>
                    {aboutEntries[aboutIndex].body.map((line, idx) => (
                      <span key={idx}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </p>

                  <div className="about-tiles">
                    {aboutTiles.map((tile, idx) => (
                      <div
                        key={tile.id}
                        className={`about-tile ${tile.active ? 'active' : ''}`}
                        onClick={() => handleAboutSelect(idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="icon-circle">
                          <img src={tile.icon} alt={`Tile ${tile.id}`} />
                        </div>
                        {tile.active && <div className="pill" />}
                        <span className="count">{tile.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="about-image-frame">
                  <img src={aboutEntries[aboutIndex].image} alt={aboutEntries[aboutIndex].title} />
                  <div className="about-badge" />
                </div>
              </div>
            </div>

            <div className="about-bottom-squares">
              <div className="square" />
              <div className="square" />
            </div>
          </div>
        </div>

        {/* Content Layer 2 */}
        <div
          className="fixed"
          style={{
            width: '100vw',
            height: '100vh',
            left: '0',
            top: '0',
            zIndex: 21,
            opacity: Math.abs(currentSection - 2) <= 1 ? 1 : 0,
            pointerEvents: currentSection === 2 ? 'auto' : 'none',
            ...slideStyle(2)
          }}
        >
          <div className="projects-section">
            <div className="large-ghost" />
            <div className="projects-ghost">OUTSIDER</div>
            <div className="projects-grid">
              <div className="projects-left">
                <div className="projects-nav">
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {projectEntries.map((entry, idx) => {
                      return (
                        <li key={entry.name}>
                          <button
                            onClick={() => handleProjectSelect(idx)}
                            onMouseEnter={() => setProjectHover(idx)}
                            onMouseLeave={() => setProjectHover(null)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              border: 'none',
                              background: 'transparent',
                              padding: '6px 0',
                              cursor: 'pointer',
                              color: '#2b2b2b',
                              fontSize: '22px',
                              fontFamily: '"Georgia", "Times New Roman", serif',
                              textAlign: 'left',
                              width: '100%'
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                fontSize: '12px',
                                color: projectIdx === idx || projectHover === idx ? '#000' : '#888888',
                                transition: 'color 0.2s ease'
                              }}
                            >
                              ◆
                            </span>
                            {entry.name}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div
                  className="projects-title-block"
                  style={{
                    opacity: projectFade ? 1 : 0,
                    transition: 'opacity 0.6s ease'
                  }}
                >
                  <div className="projects-title-top">{projectEntries[projectIdx].titleTop || projectEntries[projectIdx].name}</div>
                  <div className="projects-title-bottom">{projectEntries[projectIdx].titleBottom || projectEntries[projectIdx].name}</div>

                  <div className="projects-quote">
                    &ldquo;{projectEntries[projectIdx].description}&rdquo;
                    <small>&ldquo;{projectEntries[projectIdx].description}&rdquo;</small>
                  </div>

                  <div className="projects-meta">
                    <span className="projects-pill">EN</span>
                    <span>VA: Jamie Hoskin</span>
                    <span>⦿⦿</span>
                  </div>
                </div>
              </div>

              <div className="projects-right">
                <div
                  className="projects-hero"
                  style={{
                    opacity: projectFade ? 1 : 0,
                    transition: 'opacity 0.6s ease'
                  }}
                >
                  <img src={projectEntries[projectIdx].image} alt={projectEntries[projectIdx].name} />
                  <div className="projects-hero-overlay" />
                  <div className="projects-hero-label">{String(projectIdx + 1).padStart(2, '0')}</div>
                  <div className="projects-name">{projectEntries[projectIdx].name}</div>
                </div>
                <div className="projects-thumbs">
                  <div
                  className="projects-thumb"
                  style={{
                      opacity: projectFade ? 1 : 0,
                      transition: 'opacity 0.6s ease'
                  }}
                >
                    <img src={projectEntries[projectIdx].image} alt={`${projectEntries[projectIdx].name} thumb`} />
                  </div>
                  <div className="projects-thumb">
                    <img src="/anime-style-mythical-dragon-creature.jpg" alt="Thumbnail 2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layer 3 */}
        <div
          className="fixed"
          style={{
            width: '100vw',
            height: '100vh',
            left: '0',
            top: '0',
            zIndex: 22,
            background: 'transparent',
            opacity: Math.abs(currentSection - 3) <= 1 ? 1 : 0,
            pointerEvents: currentSection === 3 ? 'auto' : 'none',
            ...slideStyle(3)
          }}
        >
          <div className="experience-section">
            <div className="exp-watermark">DAIMON</div>
            <div className="exp-grid">
              <div className="exp-left">
                <div className="exp-title-block">
                  <span className="exp-label">Experience</span>
                </div>
                <ul className="exp-nav">
                  {expEntries.map((entry, idx) => (
                    <li
                      key={entry.title}
                      onClick={() => goToExperience(idx)}
                      onMouseEnter={() => setExpHover(idx)}
                      onMouseLeave={() => setExpHover(null)}
                      style={{
                        cursor: 'pointer',
                        color: expHover === idx ? '#000' : '#3c3c3c',
                        transition: 'color 0.2s ease'
                      }}
                    >
                      {entry.title}
                    </li>
                  ))}
                </ul>
              </div>

                <div className="exp-panels">
                  {expStrips.map((card, index) => (
                    <div
                      key={card.id}
                      className={`exp-strip exp-strip-${card.id} ${card.type === 'neutral' ? 'exp-strip-neutral' : 'exp-strip-image'}`}
                      onClick={() => goToExperience(index)}
                      style={{
                        backgroundImage: card.type === 'image'
                          ? `linear-gradient(180deg, rgba(0,0,0,0.38), rgba(0,0,0,0.15)), url('${card.image}')`
                          : undefined,
                        background: card.color,
                        minWidth: card.minWidth,
                        zIndex: expStrips.length - index,
                        boxShadow: 'none',
                        cursor: 'pointer'
                      }}
                    >
                    {/* No inner content for plain black strips */}
                    {null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Experience Detail Section (slides up from below) */}
        <div
          className="fixed"
          style={{
            width: '100vw',
            height: '100vh',
            left: '0',
            top: '0',
            zIndex: 30,
            pointerEvents: currentSection === 4 ? 'auto' : 'none',
            ...verticalSlideStyle()
          }}
        >
          <div className="exp-detail-section">
            {/* Return Button */}
            <button className="exp-detail-return" onClick={returnFromExperience}>
              <span className="exp-detail-return-arrow">‹</span>
              <span>Return</span>
            </button>

            {/* Left Arrow */}
            <button
              className="exp-detail-nav exp-detail-nav-left"
              onClick={() => handleExpChange('prev')}
            >
              <span className="exp-detail-nav-icon">‹</span>
            </button>

            {/* Right Arrow */}
            <button
              className="exp-detail-nav exp-detail-nav-right"
              onClick={() => handleExpChange('next')}
            >
              <span className="exp-detail-nav-icon">›</span>
            </button>

            {/* Main Content */}
            <div className="exp-detail-content">
              {/* Left - Particles will show through here */}
              <div className="exp-detail-particle-area" />

              {/* Right - Text */}
              <div className="exp-detail-text">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedExperience}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <div className="exp-detail-numeral-container">
                      <span className="exp-detail-numeral-line" />
                      <span className="exp-detail-numeral">{expEntries[selectedExperience]?.numeral}</span>
                      <span className="exp-detail-numeral-line" />
                    </div>

                    <h1 className="exp-detail-title">{expEntries[selectedExperience]?.title}</h1>

                    <div className="exp-detail-subtitle">
                      <span>{expEntries[selectedExperience]?.subtitle}</span>
                    </div>

                    <div className="exp-detail-description">
                      {expEntries[selectedExperience]?.description.map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

      </div>
      </>
    </Suspense>
  )
}
