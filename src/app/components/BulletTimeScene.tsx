'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

interface BulletTimeSceneProps {
  active: boolean
  onComplete: () => void
}

const ANIM_DURATION = 1.35
const START_DELAY = 900
const TRAIL_COUNT = 12
const TRAIL_SPACING = 0.03
const SPIN_SPEED = 1.5
const FLY_OUT_DURATION = 0.6

// Extreme ease-out: 93% of travel in first 20% of time, then crawls to stop
function bulletEase(t: number): number {
  return 1 - Math.pow(1 - t, 12)
}

// Bullet profile revolved around Y axis: pointed tip, cylindrical body
function createBulletGeometry(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0,    1.1),   // rounded tip
    new THREE.Vector2(0.25, 1.0),   // ogive start
    new THREE.Vector2(0.5,  0.8),   // ogive
    new THREE.Vector2(0.7,  0.5),   // shoulder
    new THREE.Vector2(0.8,  0.0),   // max width
    new THREE.Vector2(0.8, -0.6),   // body
    new THREE.Vector2(0.7, -0.75),  // base chamfer
    new THREE.Vector2(0,   -0.75),  // base center
  ]
  return new THREE.LatheGeometry(pts, 24)
}

interface BulletData {
  mesh: THREE.Mesh
  start: THREE.Vector3
  end: THREE.Vector3
  dir: THREE.Vector3
  baseQuat: THREE.Quaternion
  delay: number
  trails: THREE.Mesh[]
  started: boolean
  spinAngle: number
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
      const state = sceneRef.current
      if (state && !state.disposed && !state.flyingOut) {
        state.flyingOut = true
        state.flyOutStart = performance.now()
        state.frozen = false
      } else if (!state) {
        if (delayRef.current !== null) {
          clearTimeout(delayRef.current)
          delayRef.current = null
        }
      }
      return
    }

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

      const bulletGeo = createBulletGeometry()
      const yUp = new THREE.Vector3(0, 1, 0)

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

        // Orient bullet so its tip (Y+) points along flight direction
        const baseQuat = new THREE.Quaternion().setFromUnitVectors(yUp, dir)

        const mesh = new THREE.Mesh(bulletGeo, makeBulletMat())
        mesh.position.copy(start)
        mesh.scale.setScalar(0.12)
        mesh.quaternion.copy(baseQuat)
        scene.add(mesh)

        const trails: THREE.Mesh[] = []
        for (let t = 0; t < TRAIL_COUNT; t++) {
          const opacity = 0.6 - (t / TRAIL_COUNT) * 0.55
          const ghost = new THREE.Mesh(bulletGeo, makeTrailMat(opacity))
          ghost.visible = false
          ghost.scale.setScalar(0.12 * (1 - t * 0.02))
          ghost.quaternion.copy(baseQuat)
          scene.add(ghost)
          trails.push(ghost)
        }

        return { mesh, start, end, dir, baseQuat, delay: def.delay, trails, started: false, spinAngle: 0 }
      })

      const applySpinRotation = (b: BulletData) => {
        const spinQuat = new THREE.Quaternion().setFromAxisAngle(b.dir, b.spinAngle)
        b.mesh.quaternion.copy(spinQuat).multiply(b.baseQuat)
      }

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

        // Fly-out phase
        if (state.flyingOut) {
          const flyElapsed = (now - state.flyOutStart) / 1000

          if (flyElapsed >= FLY_OUT_DURATION) {
            cleanup()
            return
          }

          const t = flyElapsed / FLY_OUT_DURATION
          const speed = 40 * t * t

          for (const b of bullets) {
            b.mesh.position.add(b.dir.clone().multiplyScalar(speed * dt))
            b.spinAngle += SPIN_SPEED * 3 * dt
            applySpinRotation(b)
            updateTrails(b)
          }

          renderer.render(scene, camera)
          state.animationId = requestAnimationFrame(animate)
          return
        }

        // Frozen spin phase
        if (state.frozen) {
          for (const b of bullets) {
            b.spinAngle += SPIN_SPEED * dt
            applySpinRotation(b)
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
          b.spinAngle += SPIN_SPEED * dt
          applySpinRotation(b)

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
