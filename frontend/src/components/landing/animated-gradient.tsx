import { useEffect, useRef } from "react"

export function AnimatedGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []
    const particleCount = 8
    const colors = ["#ff7e5f", "#feb47b", "#ffcb80", "#7367f0"]

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    class Particle {
      x: number
      y: number
      radius: number
      color: string
      speedX: number
      speedY: number

      constructor() {
        this.x = Math.random() * canvas!.width
        this.y = Math.random() * canvas!.height
        this.radius = Math.random() * 300 + 100
        this.color = colors[Math.floor(Math.random() * colors.length)]
        this.speedX = Math.random() * 0.2 - 0.1
        this.speedY = Math.random() * 0.2 - 0.1
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x < -this.radius) this.x = canvas!.width + this.radius
        if (this.x > canvas!.width + this.radius) this.x = -this.radius
        if (this.y < -this.radius) this.y = canvas!.height + this.radius
        if (this.y > canvas!.height + this.radius) this.y = -this.radius
      }
    }

    const init = () => {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.01)")
      gradient.addColorStop(1, "rgba(255, 255, 255, 0.01)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw and update particles
      ctx.globalCompositeOperation = "screen"
      particles.forEach((particle) => {
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius)
        gradient.addColorStop(0, particle.color + "40")
        gradient.addColorStop(1, "transparent")

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        particle.update()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      init()
    }

    window.addEventListener("resize", handleResize)
    init()
    animate()

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10 opacity-30" />
}
