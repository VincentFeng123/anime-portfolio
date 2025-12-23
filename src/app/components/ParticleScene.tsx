'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'

interface ParticleSceneProps {
  currentSection: number
  selectedExperience?: number
}

const PARTICLE_COUNT = 4000

// Generate jagged hilly terrain floor
function generateMountainPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const gridSize = Math.ceil(Math.sqrt(PARTICLE_COUNT)) // ~32x32 grid

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const gridX = i % gridSize
    const gridZ = Math.floor(i / gridSize)

    // Spread across square floor area
    const x = (gridX / gridSize - 0.5) * 28
    const z = (gridZ / gridSize - 0.5) * 28

    // Create jagged hills with multiple frequencies
    const hills =
      Math.sin(x * 0.8) * 0.8 +                    // Large rolling hills
      Math.sin(z * 0.9) * 0.6 +                    // Cross hills
      Math.sin(x * 1.5 + z * 1.2) * 0.4 +          // Diagonal ridges
      Math.sin(x * 2.5) * 0.25 +                   // Sharp peaks
      Math.cos(z * 2.2) * 0.2 +                    // Sharp valleys
      Math.sin(x * 3.5 + z * 2.8) * 0.15 +         // Fine detail
      (Math.random() - 0.5) * 0.1                   // Noise for jaggedness

    // Position at bottom of screen with flatter terrain
    const y = -4 + hills * 0.35

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  return positions
}

// Generate sphere shape (rotating sphere in center)
function generateSpherePositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const radius = 3

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Fibonacci sphere distribution for even spacing
    const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT)
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  return positions
}

// Seeded random helper for consistent randomness
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// Shape 1: Heaventree - Heavenly bushy tree with floating particles
function generateHeaventreePositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const section = seededRandom(i * 1.1)
    let x, y, z

    if (section < 0.12) {
      // Trunk - elegant curved trunk
      const t = seededRandom(i * 2.3)
      const trunkHeight = t * 3 - 2.5
      const trunkRadius = 0.2 + (1 - t) * 0.15
      const angle = seededRandom(i * 3.1) * Math.PI * 2
      // Slight curve to trunk
      const curve = Math.sin(t * Math.PI) * 0.15
      x = Math.cos(angle) * trunkRadius + curve
      y = trunkHeight
      z = Math.sin(angle) * trunkRadius
    } else {
      // Big bushy canopy - overlapping spheres
      const clusterIdx = Math.floor(seededRandom(i * 4.1) * 7)
      // Cluster centers arranged for bigger bush
      const clusterCenters = [
        { x: 0, y: 2.5, z: 0 },       // Top center
        { x: 1.0, y: 1.6, z: 0.5 },   // Right upper
        { x: -0.9, y: 1.5, z: 0.6 },  // Left upper
        { x: 0.3, y: 1.0, z: -0.9 },  // Back
        { x: -0.5, y: 2.0, z: 0.8 },  // Front upper
        { x: 0.7, y: 0.8, z: 0.6 },   // Right lower
        { x: -0.6, y: 0.9, z: -0.5 }, // Left lower
      ]
      const cluster = clusterCenters[clusterIdx]

      // Random point within sphere cluster
      const phi = Math.acos(1 - 2 * seededRandom(i * 5.2))
      const theta = seededRandom(i * 6.3) * Math.PI * 2
      const r = seededRandom(i * 7.1) * 1.3

      x = cluster.x + r * Math.sin(phi) * Math.cos(theta)
      y = cluster.y + r * Math.sin(phi) * Math.sin(theta)
      z = cluster.z + r * Math.cos(phi)
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  return positions
}

// Shape 2: Originium - Hexagonal crystal
function generateOriginiumPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const section = seededRandom(i * 1.2)
    let x, y, z

    if (section < 0.6) {
      // Hexagonal prism edges
      const edgeIdx = Math.floor(seededRandom(i * 2.1) * 6)
      const angle1 = (edgeIdx / 6) * Math.PI * 2
      const angle2 = ((edgeIdx + 1) / 6) * Math.PI * 2
      const t = seededRandom(i * 3.3)
      const radius = 2.5
      const height = (seededRandom(i * 4.1) - 0.5) * 4
      x = Math.cos(angle1) * radius * (1 - t) + Math.cos(angle2) * radius * t
      y = height
      z = Math.sin(angle1) * radius * (1 - t) + Math.sin(angle2) * radius * t
    } else if (section < 0.8) {
      // Top and bottom hexagon faces
      const angle = seededRandom(i * 5.2) * Math.PI * 2
      const radius = seededRandom(i * 6.1) * 2.5
      const top = seededRandom(i * 7.3) > 0.5 ? 2 : -2
      x = Math.cos(angle) * radius
      y = top
      z = Math.sin(angle) * radius
    } else {
      // Inner glow particles
      const angle = seededRandom(i * 8.2) * Math.PI * 2
      const radius = seededRandom(i * 9.1) * 1.5
      const height = (seededRandom(i * 10.3) - 0.5) * 3
      x = Math.cos(angle) * radius
      y = height
      z = Math.sin(angle) * radius
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  return positions
}

// Shape 3: Rhodes Island - Island Map Shape
function generateRhodesPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  // Island shape function - creates irregular coastline
  const islandRadius = (angle: number) => {
    return 2.5 +
      Math.sin(angle * 2) * 0.6 +
      Math.sin(angle * 3 + 1) * 0.4 +
      Math.sin(angle * 5 + 2) * 0.25 +
      Math.cos(angle * 4) * 0.3
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const section = seededRandom(i * 1.3)
    let x, y, z

    if (section < 0.7) {
      // Island landmass - fill the island shape (facing front)
      const angle = seededRandom(i * 2.1) * Math.PI * 2
      const maxR = islandRadius(angle)
      const r = Math.sqrt(seededRandom(i * 3.2)) * maxR // sqrt for even distribution
      x = Math.cos(angle) * r
      y = Math.sin(angle) * r
      // Slight depth variation
      z = (seededRandom(i * 4.3) - 0.3) * 0.4 + Math.sin(x * 2) * 0.1 + Math.cos(y * 2) * 0.1
    } else{
      // Coastline - denser particles at edges
      const angle = seededRandom(i * 5.1) * Math.PI * 2
      const coastR = islandRadius(angle) * (0.95 + seededRandom(i * 6.2) * 0.1)
      x = Math.cos(angle) * coastR
      y = Math.sin(angle) * coastR
      z = (seededRandom(i * 7.3) - 0.5) * 0.15
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  return positions
}

// Shape 4: Talos-II - Planet with close ring
function generateTalosPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const sphereCount = Math.floor(PARTICLE_COUNT * 0.65)
  const radius = 2

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x, y, z

    if (i < sphereCount) {
      // Fibonacci sphere for even distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / sphereCount)
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
      x = radius * Math.sin(phi) * Math.cos(theta)
      y = radius * Math.cos(phi)
      z = radius * Math.sin(phi) * Math.sin(theta)
    } else {
      // Diagonal ring around planet (tilted 25 degrees around X axis)
      const ringIdx = i - sphereCount
      const angle = seededRandom(ringIdx * 4.3) * Math.PI * 2
      const ringRadius = 2.5 + seededRandom(ringIdx * 5.1) * 0.4
      const tilt = Math.PI * 0.14 // 25 degree tilt

      // Ring in tilted plane
      x = Math.cos(angle) * ringRadius
      y = Math.sin(angle) * ringRadius * Math.sin(tilt)
      z = Math.sin(angle) * ringRadius * Math.cos(tilt)

      // Add slight thickness
      const thick = (seededRandom(ringIdx * 6.2) - 0.5) * 0.08
      x += thick * 0.3
      y += thick * Math.cos(tilt)
      z += thick * Math.sin(tilt)
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  return positions
}

// Shape 5: Endfield - Diamond/rhombus
function generateEndfieldPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const section = seededRandom(i * 1.5)
    let x, y, z

    if (section < 0.7) {
      // Diamond edges
      const edgeIdx = Math.floor(seededRandom(i * 2.1) * 8)
      const t = seededRandom(i * 3.2)

      // Diamond vertices: top, bottom, and 4 middle points
      const vertices = [
        [0, 3, 0],    // top
        [0, -3, 0],   // bottom
        [2, 0, 0],    // right
        [-2, 0, 0],   // left
        [0, 0, 2],    // front
        [0, 0, -2],   // back
      ]

      const v1 = vertices[edgeIdx % 6]
      const v2 = vertices[(edgeIdx + 1) % 6]

      x = v1[0] * (1 - t) + v2[0] * t + (seededRandom(i * 4.1) - 0.5) * 0.2
      y = v1[1] * (1 - t) + v2[1] * t + (seededRandom(i * 5.2) - 0.5) * 0.2
      z = v1[2] * (1 - t) + v2[2] * t + (seededRandom(i * 6.3) - 0.5) * 0.2
    } else {
      // Inner sparkle
      const radius = seededRandom(i * 7.1) * 1.5
      const angle = seededRandom(i * 8.2) * Math.PI * 2
      const height = (seededRandom(i * 9.3) - 0.5) * 4
      x = Math.cos(angle) * radius * 0.5
      y = height
      z = Math.sin(angle) * radius * 0.5
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  return positions
}

// Generate interstellar-style spaceship with rings and central spine
function generateSpaceshipPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  // Ship dimensions - larger scale
  const shipLength = 18
  const spineRadius = 0.5
  const ringRadius = 4.2
  const ringThickness = 0.28
  const ringPositions = [-3, 0, 3, 5] // Z positions of the 4 rings

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const section = Math.random()
    let x, y, z

    if (section < 0.20) {
      // Central spine/body - long cylinder
      const angle = Math.random() * Math.PI * 2
      const zPos = (Math.random() - 0.5) * shipLength
      // Vary radius along length - thicker in middle
      const radiusVar = spineRadius * (1 + 0.3 * Math.sin((zPos / shipLength + 0.5) * Math.PI))
      x = Math.cos(angle) * radiusVar
      y = Math.sin(angle) * radiusVar
      z = zPos
    } else if (section < 0.55) {
      // Large rings (torus shapes) - most particles here for visibility
      const ringIdx = Math.floor(Math.random() * ringPositions.length)
      const ringZ = ringPositions[ringIdx]
      const torusAngle = Math.random() * Math.PI * 2 // Around the ring
      const tubeAngle = Math.random() * Math.PI * 2 // Around the tube

      // Torus parametric equations
      const tubeRadius = ringThickness + Math.random() * 0.15
      x = (ringRadius + tubeRadius * Math.cos(tubeAngle)) * Math.cos(torusAngle)
      y = (ringRadius + tubeRadius * Math.cos(tubeAngle)) * Math.sin(torusAngle)
      z = ringZ + tubeRadius * Math.sin(tubeAngle)
    } else if (section < 0.65) {
      // Structural spokes connecting rings to spine
      const ringIdx = Math.floor(Math.random() * ringPositions.length)
      const ringZ = ringPositions[ringIdx]
      const spokeAngle = Math.floor(Math.random() * 8) * (Math.PI / 4) // 8 spokes per ring
      const spokePos = Math.random() // Position along spoke
      const spokeRadius = spineRadius + spokePos * (ringRadius - spineRadius - ringThickness)

      x = Math.cos(spokeAngle) * spokeRadius + (Math.random() - 0.5) * 0.15
      y = Math.sin(spokeAngle) * spokeRadius + (Math.random() - 0.5) * 0.15
      z = ringZ + (Math.random() - 0.5) * 0.3
    } else if (section < 0.75) {
      // Engine section (back) - multiple engine bells
      const engineZ = -shipLength / 2 - 1
      const engineCount = 4
      const engineIdx = Math.floor(Math.random() * engineCount)
      const engineAngle = (engineIdx / engineCount) * Math.PI * 2 + Math.PI / 4
      const engineOffset = 1.2

      // Cone shape for engine bells
      const conePos = Math.random()
      const coneRadius = 0.8 * (1 - conePos * 0.5)
      const localAngle = Math.random() * Math.PI * 2

      x = Math.cos(engineAngle) * engineOffset + Math.cos(localAngle) * coneRadius
      y = Math.sin(engineAngle) * engineOffset + Math.sin(localAngle) * coneRadius
      z = engineZ - conePos * 2
    } else if (section < 0.82) {
      // Engine glow/exhaust particles
      const engineZ = -shipLength / 2 - 3
      const engineCount = 4
      const engineIdx = Math.floor(Math.random() * engineCount)
      const engineAngle = (engineIdx / engineCount) * Math.PI * 2 + Math.PI / 4
      const engineOffset = 1.2

      const exhaustSpread = Math.random() * 0.6
      const localAngle = Math.random() * Math.PI * 2

      x = Math.cos(engineAngle) * engineOffset + Math.cos(localAngle) * exhaustSpread
      y = Math.sin(engineAngle) * engineOffset + Math.sin(localAngle) * exhaustSpread
      z = engineZ - Math.random() * 1.5
    } else if (section < 0.90) {
      // Front nose/cockpit section - bullet shaped
      const noseStart = shipLength / 2
      const noseLength = 3
      const nosePos = Math.random()
      const noseRadius = 0.8 * (1 - nosePos * 0.8) // Tapers to point
      const angle = Math.random() * Math.PI * 2

      x = Math.cos(angle) * noseRadius
      y = Math.sin(angle) * noseRadius
      z = noseStart + nosePos * noseLength
    } else if (section < 0.95) {
      // Truss framework between rings
      const ringIdx = Math.floor(Math.random() * (ringPositions.length - 1))
      const z1 = ringPositions[ringIdx]
      const z2 = ringPositions[ringIdx + 1]
      const trussAngle = Math.floor(Math.random() * 4) * (Math.PI / 2) // 4 main trusses
      const trussRadius = ringRadius * 0.85

      z = z1 + Math.random() * (z2 - z1)
      x = Math.cos(trussAngle) * trussRadius + (Math.random() - 0.5) * 0.3
      y = Math.sin(trussAngle) * trussRadius + (Math.random() - 0.5) * 0.3
    } else {
      // Detail particles on spine - panels, antennae, etc
      const angle = Math.random() * Math.PI * 2
      const zPos = (Math.random() - 0.5) * shipLength * 0.8
      const detailRadius = spineRadius + 0.1 + Math.random() * 0.3

      x = Math.cos(angle) * detailRadius
      y = Math.sin(angle) * detailRadius
      z = zPos
    }

    // Apply diagonal tilt - nose pointing up and to the right
    const tiltX = -Math.PI * 0.35 // Tilt nose up
    const tiltY = Math.PI * 0.25  // Point to the right

    // Rotate around X axis (tilt up/down)
    const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX)
    const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX)

    // Rotate around Y axis (point left/right)
    const x2 = x * Math.cos(tiltY) + z1 * Math.sin(tiltY)
    const z2 = -x * Math.sin(tiltY) + z1 * Math.cos(tiltY)

    positions[i * 3] = x2
    positions[i * 3 + 1] = y1
    positions[i * 3 + 2] = z2
  }

  return positions
}

// Generate text shape by sampling canvas pixels (browser-only)
function generateTextPositions(text: string): Float32Array {
  if (typeof document === 'undefined') return new Float32Array(PARTICLE_COUNT * 3)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return new Float32Array(PARTICLE_COUNT * 3)

  canvas.width = 1200
  canvas.height = 360
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = text.split('\n')
  const fontSize = 180
  const lineHeight = 200
  const totalHeight = lineHeight * lines.length
  ctx.font = `bold ${fontSize}px Arial`
  lines.forEach((line, idx) => {
    const y = canvas.height / 2 - totalHeight / 2 + lineHeight * idx + lineHeight / 2
    ctx.fillText(line, canvas.width / 2, y)
  })

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const points: Array<{ x: number; y: number }> = []

  const step = 4 // sample every 4px for density control
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const idx = (y * canvas.width + x) * 4 + 3 // alpha channel
      if (data[idx] > 128) {
        // center and scale down
        const cx = (x - canvas.width / 2) / 35
        const cy = (canvas.height / 2 - y) / 35
        points.push({ x: cx, y: cy })
      }
    }
  }

  const positions = new Float32Array(PARTICLE_COUNT * 3)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pick = points.length ? points[i % points.length] : { x: 0, y: 0 }
    positions[i * 3] = pick.x + (Math.random() - 0.5) * 0.2
    positions[i * 3 + 1] = pick.y + (Math.random() - 0.5) * 0.2
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3
  }

  return positions
}

export default function ParticleScene({ currentSection, selectedExperience = 0 }: ParticleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)
  const targetPositionsRef = useRef<Float32Array | null>(null)
  const currentPositionsRef = useRef<Float32Array | null>(null)
  const frameRef = useRef<number>(0)
  const rotationRef = useRef({ x: 0, y: 0 })
  const currentSectionRef = useRef<number>(0)
  const selectedExperienceRef = useRef<number>(0)
  const textPositionsRef = useRef<Float32Array | null>(null)

  const shapePositions = useMemo(() => ({
    mountains: generateMountainPositions(),
    sphere: generateSpherePositions(),
    spaceship: generateSpaceshipPositions(),
    expShapes: [
      generateHeaventreePositions(),
      generateOriginiumPositions(),
      generateRhodesPositions(),
      generateTalosPositions(),
      generateEndfieldPositions()
    ]
  }), [])

  useEffect(() => {
    // Only generate text positions client-side
    textPositionsRef.current = generateTextPositions('VINCENT\nFENG')
  }, [])

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 10
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create circular blurred dot texture
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    // Clear with transparent
    ctx.clearRect(0, 0, 64, 64)
    // Draw blurred black circle - more opaque
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.9)')
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(32, 32, 32, 0, Math.PI * 2)
    ctx.fill()
    const dotTexture = new THREE.CanvasTexture(canvas)

    // Particles
    const geometry = new THREE.BufferGeometry()
    const initialPositions = new Float32Array(PARTICLE_COUNT * 3)

    // Start with mountain positions
    initialPositions.set(shapePositions.mountains)
    currentPositionsRef.current = new Float32Array(initialPositions)
    targetPositionsRef.current = new Float32Array(shapePositions.mountains)

    geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      map: dotTexture,
      depthWrite: false
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)
    particlesRef.current = particles

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return
      cameraRef.current.aspect = window.innerWidth / window.innerHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)

      if (!particlesRef.current || !currentPositionsRef.current || !targetPositionsRef.current) return

      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array

      // Smooth interpolation towards target positions
      for (let i = 0; i < positions.length; i++) {
        currentPositionsRef.current[i] += (targetPositionsRef.current[i] - currentPositionsRef.current[i]) * 0.02
        positions[i] = currentPositionsRef.current[i]
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true

      // Rotate shapes - Rhodes Island stays still with slight tilt
      if (currentSectionRef.current === 0) {
        particlesRef.current.rotation.x = 0
        particlesRef.current.rotation.y = 0
        particlesRef.current.rotation.z = 0
      } else if (currentSectionRef.current === 4 && selectedExperienceRef.current === 2) {
        // Rhodes Island: no rotation, slight tilt to show topography
        particlesRef.current.rotation.x = 0.25
        particlesRef.current.rotation.y = 0
        particlesRef.current.rotation.z = 0
      } else {
        rotationRef.current.y += 0.002
        particlesRef.current.rotation.x = 0
        particlesRef.current.rotation.y = rotationRef.current.y
        particlesRef.current.rotation.z = 0
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameRef.current)
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [shapePositions])

  // Update target positions when section changes
  useEffect(() => {
    if (!targetPositionsRef.current || !cameraRef.current || !particlesRef.current) return

    // Update the ref for animation loop
    currentSectionRef.current = currentSection
    selectedExperienceRef.current = selectedExperience

    let newPositions: Float32Array
    let cameraZ = 10
    let cameraY = 0
    let cameraX = 0

    switch (currentSection) {
      case 0: // Hero text
        newPositions = textPositionsRef.current || shapePositions.mountains
        cameraZ = 20
        cameraY = 0
        cameraX = 0
        break
      case 1: // Mountains
        newPositions = shapePositions.mountains
        cameraZ = 12
        cameraY = 0
        cameraX = 0
        break
      case 2: // Sphere
        newPositions = shapePositions.sphere
        cameraZ = 10
        cameraY = 0
        cameraX = 0
        break
      case 3: // Spaceship - shift camera left so particles appear on the right
        newPositions = shapePositions.spaceship
        cameraZ = 18
        cameraY = 1
        cameraX = -8
        break
      case 4: // Experience shapes - each has unique position
        newPositions = shapePositions.expShapes[selectedExperience] || shapePositions.expShapes[0]
        // Define unique positions for each experience shape
        const expPositions = [
          { x: 3.5, y: 0.3, z: 8 },   // 0: Heaventree
          { x: 3.5, y: 0, z: 8 },     // 1: Originium
          { x: 3.7, y: 0, z: 9 },     // 2: Rhodes Island (star compass)
          { x: 3.0, y: 0, z: 8 },     // 3: Talos-II (planet)
          { x: 3.5, y: 0, z: 8 },     // 4: Endfield
        ]
        const pos = expPositions[selectedExperience] || expPositions[0]
        cameraX = pos.x
        cameraY = pos.y
        cameraZ = pos.z
        break
      default:
        newPositions = shapePositions.mountains
        cameraZ = 12
        cameraY = 0
        cameraX = 0
    }

    targetPositionsRef.current.set(newPositions)

    // Update particle size based on section
    const material = particlesRef.current.material as THREE.PointsMaterial
    material.size = currentSection === 4 ? 0.04 : currentSection === 0 ? 0.12 : 0.08

    // Set camera position - instant for section 4, animated for others
    if (currentSection === 4) {
      // Instant position for section 4 experiences
      cameraRef.current.position.x = cameraX
      cameraRef.current.position.y = cameraY
      cameraRef.current.position.z = cameraZ
    } else {
      // Animate camera position for other sections
      const animateCamera = () => {
        if (!cameraRef.current) return
        cameraRef.current.position.x += (cameraX - cameraRef.current.position.x) * 0.05
        cameraRef.current.position.y += (cameraY - cameraRef.current.position.y) * 0.05
        cameraRef.current.position.z += (cameraZ - cameraRef.current.position.z) * 0.05
      }

      const cameraInterval = setInterval(animateCamera, 16)
      const timeout = setTimeout(() => clearInterval(cameraInterval), 2000)

      // Cleanup previous interval when effect re-runs
      return () => {
        clearInterval(cameraInterval)
        clearTimeout(timeout)
      }
    }

  }, [currentSection, selectedExperience, shapePositions])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: currentSection === 0 ? -1 : 11,
        opacity: currentSection === 0 ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out'
      }}
    />
  )
}
