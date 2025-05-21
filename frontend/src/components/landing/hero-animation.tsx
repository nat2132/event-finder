import { useEffect, useRef } from "react"

export function HeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cards = Array.from(container.querySelectorAll(".event-card"))
    if (cards.length === 0) return

    let animationFrameId: number
    const positions = cards.map(() => ({ x: 0, y: 0, rotation: 0 }))

    const animate = () => {
      cards.forEach((card, index) => {
        const htmlCard = card as HTMLElement

        // Create subtle floating animation
        const time = Date.now() * 0.001 + index * 1.5
        const yMovement = Math.sin(time) * 10
        const xMovement = Math.cos(time * 0.8) * 5
        const rotation = Math.sin(time * 0.5) * 2

        // Smooth transitions
        positions[index].y += (yMovement - positions[index].y) * 0.05
        positions[index].x += (xMovement - positions[index].x) * 0.05
        positions[index].rotation += (rotation - positions[index].rotation) * 0.05

        htmlCard.style.transform = `translate(${positions[index].x}px, ${positions[index].y}px) rotate(${positions[index].rotation}deg)`
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative h-[400px] w-[400px] md:h-[500px] md:w-[500px]">
      <div className="event-card absolute left-0 top-0 z-10 h-64 w-48 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ease-out">
        <img
          src="./festival.jpg"
          alt="Music Festival"
          width={192}
          height={256}
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h4 className="text-primary font-bold">Music Festival</h4>
          <p className="text-primary text-sm">Aug 15-17</p>
        </div>
      </div>
      <div className="event-card absolute left-20 top-20 z-20 h-64 w-48 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ease-out">
        <img
          src="/tech.jpg"
          alt="Tech Conference"
          width={192}
          height={256}
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h4 className="text-primary font-bold">Tech Conference</h4>
          <p className="text-primary text-sm">Oct 5-7</p>
        </div>
      </div>
      <div className="event-card absolute left-40 top-40 z-30 h-64 w-48 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ease-out">
        <img
          src="./food.jpg"
          alt="Food Festival"
          width={192}
          height={256}
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h4 className="text-primary font-bold">Food Festival</h4>
          <p className="text-primary text-sm">Sep 12-14</p>
        </div>
      </div>
      <div className="event-card absolute right-20 top-20 z-40 h-64 w-48 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ease-out">
        <img
          src="./sport.jpg"
          alt="Sports Tournament"
          width={192}
          height={256}
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h4 className="text-primary font-bold">Sports Tournament</h4>
          <p className="text-primary text-sm">Nov 20-22</p>
        </div>
      </div>
      <div className="event-card absolute right-0 top-0 z-50 h-64 w-48 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ease-out">
        <img
          src="./art.jpg"
          alt="Art Exhibition"
          width={192}
          height={256}
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h4 className="text-primary font-bold">Art Exhibition</h4>
          <p className="text-primary text-sm">Dec 1-15</p>
        </div>
      </div>
    </div>
  )
}
