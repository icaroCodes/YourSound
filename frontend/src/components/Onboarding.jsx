import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { ChevronRight, ChevronLeft, Search, Heart, Plus, Music, Sparkles, X } from 'lucide-react'
import gsap from 'gsap'

/**
 * YourSound "Absolute Guard" Onboarding (v14)
 * - Step-specific position locking.
 * - Forces BOTTOM for playlist creation.
 */

function getTargetRect(target) {
  if (!target) return null
  const el = document.querySelector(`[data-onboarding="${target}"]`)
  if (!el || el.offsetParent === null) return null 
  return el.getBoundingClientRect()
}

export default function Onboarding() {
  const { isActive, currentStep, steps, nextStep, skip, prevStep } = useOnboardingStore()
  const [rect, setRect] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [position, setPosition] = useState('bottom') 
  const rafRef = useRef(null)

  const track = useCallback(() => {
    if (!isActive) return
    const step = steps[currentStep]
    if (step) {
      const r = getTargetRect(step.target)
      setRect(r)
      
      const screenHeight = window.innerHeight
      
      // STEP-SPECIFIC OVERRIDES
      if (step.id === 'create-playlist') {
        setPosition('bottom')
      } else if (r) {
        const targetCenterY = r.top + r.height / 2
        // If target is in TOP 60%, Pill MUST be BOTTOM (always)
        if (targetCenterY < screenHeight * 0.6) {
          setPosition('bottom')
        } else {
          setPosition('top')
        }
      } else {
        setPosition('bottom')
      }
    }
    rafRef.current = requestAnimationFrame(track)
  }, [isActive, currentStep, steps])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    if (isActive) rafRef.current = requestAnimationFrame(track)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isActive, track])

  if (!isActive || !isMobile) return null

  const step = steps[currentStep]
  if (!step) return null

  return createPortal(
    <>
      {/* Spotlight highlight */}
      {rect && (
        <div 
          className="fixed border-[3px] border-spotify-green rounded-2xl shadow-[0_0_20px_rgba(30,212,94,0.4)] pointer-events-none z-[9999998]"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* FIXED POSITION PILL */}
      <div 
        className="fixed left-6 right-6 z-[9999999] pointer-events-none flex justify-center"
        style={{
          [position === 'top' ? 'top' : 'bottom']: '2.5rem',
          transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)'
        }}
      >
        <div className="pointer-events-auto w-full max-w-[380px]">
          <FinalPill 
            step={step}
            onNext={nextStep}
            onSkip={skip}
          />
        </div>
      </div>
    </>,
    document.body
  )
}

function FinalPill({ step, onNext, onSkip }) {
  const pillRef = useRef(null)

  useLayoutEffect(() => {
    gsap.fromTo(pillRef.current, 
      { scale: 0.9, opacity: 0, y: 10 }, 
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    )
  }, [step.id])

  return (
    <div 
      ref={pillRef}
      className="bg-[#121212]/98 backdrop-blur-3xl border border-white/20 rounded-[2rem] px-6 py-4 shadow-[0_40px_80px_rgba(0,0,0,0.9)] flex items-center justify-between gap-4"
    >
      <div className="flex-1 min-w-0">
        <h4 className="text-spotify-green font-black text-[10px] uppercase tracking-[0.2em] mb-0.5">Sugestão</h4>
        <h3 className="text-white font-black text-xs leading-tight tracking-tight">{step.title}</h3>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={onNext}
          className="bg-spotify-green text-black font-black text-[10px] uppercase px-6 py-3 rounded-full active:scale-95 transition-all shadow-xl"
        >
          Próximo
        </button>
      </div>
    </div>
  )
}
