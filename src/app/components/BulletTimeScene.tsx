'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

interface BulletTimeSceneProps {
  active: boolean
  onComplete: () => void
}

const ANIM_DURATION = 1.5
const START_DELAY = 900
const TRAIL_COUNT = 12
const TRAIL_SPACING = 0.03
const SPIN_SPEED = 1.5
const FLY_OUT_DURATION = 0.6

// Extreme ease-out: 93% of travel in first 20% of time, then crawls to stop
function bulletEase(t: number): number {
  return 1 - Math.pow(1 - t, 12)
}

interface BulletData {
  mesh: THREE.Mesh
  start: THREE.Vector3
  end: THREE.Vector3
  dir: THREE.Vector3
  delay: number
  trails: THREE.Mesh[]
  started: boolean
}

export default function BulletTimeScene({ active, onComplete }: BulletTimeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const delayRef = useRef<number | null>(null)

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    bullets: BulletData[]
    texture: THREE.Texture
    startTime: number
    animationId: number
    disposed: boolean
    frozen: boolean
    flyingOut: boolean
    flyOutStart: number
    lastTimestamp: number
    resizeHandler: () => void
  } | null>(null)

  const cleanup = useCallback(() => {
    if (delayRef.current !== null) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    const state = sceneRef.current
    if (!state) return
    state.disposed = true
    cancelAnimationFrame(state.animationId)
    window.removeEventListener('resize', state.resizeHandler)
    state.texture.dispose()
    state.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
        else obj.material.dispose()
      }
    })
    state.renderer.dispose()
    if (containerRef.current && state.renderer.domElement.parentNode === containerRef.current) {
      containerRef.current.removeChild(state.renderer.domElement)
    }
    sceneRef.current = null
  }, [])

  useEffect(() => {
    if (!active) {
      // If scene exists, trigger fly-out instead of immediate cleanup
      const state = sceneRef.current
      if (state && !state.disposed && !state.flyingOut) {
        state.flyingOut = true
        state.flyOutStart = performance.now()
        state.frozen = false
      } else if (!state) {
        // No scene — just clear any pending delay
        if (delayRef.current !== null) {
          clearTimeout(delayRef.current)
          delayRef.current = null
        }
      }
      return
    }

    // Active: always fresh start
    cleanup()

    const container = containerRef.current
    if (!container) return
    container.style.display = 'block'

    delayRef.current = window.setTimeout(() => {
      delayRef.current = null
      if (sceneRef.current) return

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200)
      camera.position.set(0, 0, 10)
      camera.lookAt(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      const textureLoader = new THREE.TextureLoader()
      const texture = textureLoader.load('/4060492.jpg')
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(0.4, 0.4)
      texture.offset.set(0.3, 0.3)

      const aspect = window.innerWidth / window.innerHeight
      const fovRad = (60 * Math.PI) / 180
      const endDist = 3
      const halfH = endDist * Math.tan(fovRad / 2)
      const halfW = halfH * aspect
      const eX = halfW * 0.90
      const eY = halfH * 0.90

      const trajectoryDefs = [
        { sx: 0, sy: 0, sz: -60, ex: -eX,        ey: eY * 0.7,  ez: 7, delay: 0 },
        { sx: 0, sy: 0, sz: -60, ex: eX,          ey: -eY * 0.5, ez: 7, delay: 0.06 },
        { sx: 0, sy: 0, sz: -60, ex: eX * 0.6,    ey: eY,        ez: 7, delay: 0.04 },
        { sx: 0, sy: 0, sz: -60, ex: -eX,         ey: -eY * 0.4, ez: 7, delay: 0.09 },
        { sx: 0, sy: 0, sz: -60, ex: eX * 0.55,   ey: -eY * 0.8, ez: 7, delay: 0.1 },
      ]

      const ballGeo = new THREE.SphereGeometry(1, 32, 32)

      const makeBulletMat = () => new THREE.MeshBasicMaterial({
        map: texture,
      })

      const makeTrailMat = (opacity: number) => new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthWrite: false,
      })

      const bullets: BulletData[] = trajectoryDefs.map((def) => {
        const start = new THREE.Vector3(def.sx, def.sy, def.sz)
        const end = new THREE.Vector3(def.ex, def.ey, def.ez)
        const dir = new THREE.Vector3().subVectors(end, start).normalize()

        const mesh = new THREE.Mesh(ballGeo, makeBulletMat())
        mesh.position.copy(start)
        mesh.scale.setScalar(0.12)
        scene.add(mesh)

        const trails: THREE.Mesh[] = []
        for (let t = 0; t < TRAIL_COUNT; t++) {
          const opacity = 0.6 - (t / TRAIL_COUNT) * 0.55
          const ghost = new THREE.Mesh(ballGeo, makeTrailMat(opacity))
          ghost.visible = false
          ghost.scale.setScalar(0.12 * (1 - t * 0.02))
          scene.add(ghost)
          trails.push(ghost)
        }

        return { mesh, start, end, dir, delay: def.delay, trails, started: false }
      })

      const updateTrails = (b: BulletData) => {
        for (let t = 0; t < TRAIL_COUNT; t++) {
          const ghost = b.trails[t]
          const offset = (t + 1) * TRAIL_SPACING
          ghost.position.copy(b.mesh.position).sub(b.dir.clone().multiplyScalar(offset))
          ghost.visible = b.started
        }
      }

      const handleResize = () => {
        if (state.disposed) return
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }

      const state = {
        renderer, scene, camera, bullets, texture,
        startTime: performance.now(),
        animationId: 0,
        disposed: false,
        frozen: false,
        flyingOut: false,
        flyOutStart: 0,
        lastTimestamp: performance.now(),
        resizeHandler: handleResize,
      }
      sceneRef.current = state
      window.addEventListener('resize', handleResize)

      const animate = () => {
        if (state.disposed) return

        const now = performance.now()
        const dt = (now - state.lastTimestamp) / 1000
        state.lastTimestamp = now

        // Fly-out phase: bullets accelerate off screen then cleanup
        if (state.flyingOut) {
          const flyElapsed = (now - state.flyOutStart) / 1000

          if (flyElapsed >= FLY_OUT_DURATION) {
            cleanup()
            return
          }

          // Ease-in: accelerate outward
          const t = flyElapsed / FLY_OUT_DURATION
          const speed = 40 * t * t

          for (const b of bullets) {
            b.mesh.position.add(b.dir.clone().multiplyScalar(speed * dt))
            b.mesh.rotation.z += SPIN_SPEED * 3 * dt
            updateTrails(b)
          }

          renderer.render(scene, camera)
          state.animationId = requestAnimationFrame(animate)
          return
        }

        // Frozen spin phase
        if (state.frozen) {
          for (const b of bullets) {
            b.mesh.rotation.z += SPIN_SPEED * dt
          }
          renderer.render(scene, camera)
          state.animationId = requestAnimationFrame(animate)
          return
        }

        // Shoot-in phase
        const elapsed = (now - state.startTime) / 1000
        const globalProgress = Math.min(elapsed / ANIM_DURATION, 1)

        if (globalProgress >= 1) {
          state.frozen = true
          for (const b of bullets) {
            updateTrails(b)
          }
          renderer.render(scene, camera)
          state.animationId = requestAnimationFrame(animate)
          return
        }

        for (let i = 0; i < bullets.length; i++) {
          const b = bullets[i]
          const bulletElapsed = elapsed - b.delay * ANIM_DURATION
          if (bulletElapsed < 0) continue

          b.started = true
          const effectiveDur = ANIM_DURATION * (1 - b.delay)
          const bp = Math.min(bulletElapsed / effectiveDur, 1)

          const pos = new THREE.Vector3().lerpVectors(b.start, b.end, bulletEase(bp))
          b.mesh.position.copy(pos)
          b.mesh.rotation.z += SPIN_SPEED * dt

          updateTrails(b)
        }

        renderer.render(scene, camera)
        state.animationId = requestAnimationFrame(animate)
      }

      state.animationId = requestAnimationFrame(animate)
    }, START_DELAY)

    return () => {
      if (delayRef.current !== null) {
        clearTimeout(delayRef.current)
        delayRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    return () => cleanup()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="bullet-time-overlay"
    />
  )
}
