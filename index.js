const random = (min, max) => Math.random() * (max - min) + min;

const createParticles = (canvas, initialRadiusRange) => {
	const particles = [];
	const canvasCenter = [canvas.width / 2, canvas.height / 2]
	for (let i = 0; i < 50; i++) {
		const radius = random(...initialRadiusRange);
		particles.push({
			position: [...canvasCenter],
			velocity: [0, 0],
			initialRadius: radius,
			radius: radius,
			time: 0,
			colour: {h: 0, s: 100, l: 20, a: 100},
			duration: random(...[2, 4])
		});
	}
	return particles;
};

const linearInterpolation = (x, x1, y1, x2, y2) => {
	return (y2 - y1) / (x2 - x1) * (x - x1) + y1;
};

const updateParticles = (particles, timestep, canvas, initialRadiusRange) => {
	const clamp = (x, min, max) => x < min ? min : (x > max ? max : x);
	const integrate = (y, f, h) => [y[0] + f[0] * h, y[1] + f[1] * h];

	const canvasCenter = [canvas.width / 2, canvas.height / 2];
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		p.time += timestep;
		if (p.time >= p.duration) {
			p.position = canvasCenter.map(component => component + random(-10, 10));
			p.velocity = [0, 0];
			p.initialRadius = p.radius = random(...initialRadiusRange);
			p.time = 0;
		} else {
			p.radius = linearInterpolation(p.time, 0, p.initialRadius, p.duration, 0);
		}

		const jitter = linearInterpolation(p.time, 0, 200, p.duration, 600);
		const acceleration = [random(-jitter, jitter), random(0, 2 * jitter)];

		p.velocity = integrate(p.velocity, acceleration, timestep);
		const maxSpeed = 100;
		p.velocity = p.velocity.map(v => clamp(v, -maxSpeed, maxSpeed));

		p.position = integrate(p.position, p.velocity, timestep);

		p.colour.h = linearInterpolation(p.time, 0, 30, p.duration, 0);
		p.colour.l = linearInterpolation(p.time, 0, 70, p.duration, 30);
	}
};

const drawParticles = (particles, context) => {
	// Note: This loop is causing performance issues.
	for (const particle of particles) {
		const gradient = context.createRadialGradient(
			...particle.position,
			2 * particle.radius,
			...particle.position,
			15 * particle.radius
		);

		const maxAlpha = 20;
		const alpha = Math.min(
			linearInterpolation(particle.time, 0, 0, 0.1, maxAlpha), 
			maxAlpha
		);
		
		const c = particle.colour;
		gradient.addColorStop(0, `hsl(${c.h}deg, ${c.s}%, ${c.l}%, ${alpha}%)`);
		gradient.addColorStop(1, `hsl(${c.h}deg, ${c.s}%, ${2}%, 10%)`);

		context.fillStyle = gradient;
		context.fillRect(0, 0, context.canvas.width, context.canvas.height);
	}

	for (const particle of particles) {
		context.beginPath();
		context.arc(...particle.position, particle.radius, 0, 2 * Math.PI);
		const c = particle.colour;
		context.fillStyle = `hsl(${c.h}deg, ${c.s}%, ${c.l}%, ${c.a}%)`;
		context.fill();
	}
};

const simulateParticles = (particles, update, timestep, canvas, initialRadiusRange, duration = timestep) => {
	for (let t = 0; t < duration; t += timestep) {
		update(particles, timestep, canvas, initialRadiusRange);
	}
};

window.onload = () => {
	const initialRadiusRange = [40, 80];
	const canvas = document.querySelector("canvas");
	const context = canvas.getContext("2d");

	window.addEventListener("resize", () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	});
	window.dispatchEvent(new Event("resize"));

	const particles = createParticles(canvas, initialRadiusRange);

	const timestep = 1 / 120;
	simulateParticles(particles, updateParticles, timestep, canvas, initialRadiusRange, 10);
	
	let accumulatedTime = 0;
	let previousTime = performance.now() / 1000;
	const computeNextFrame = (time) => {
		requestAnimationFrame(computeNextFrame);

		time /= 1000;
		accumulatedTime = Math.min(0.25, accumulatedTime + time - previousTime);
		previousTime = time;

		while (accumulatedTime > timestep) {
			accumulatedTime -= timestep;
			simulateParticles(particles, updateParticles, timestep, canvas, initialRadiusRange);
		}
		
		context.fillStyle = "hsl(0deg, 0%, 20%)";
		context.fillRect(0, 0, canvas.width, canvas.height);

		context.save();
		context.scale(1, -1);
		context.translate(0, -canvas.height);
		drawParticles(particles, context);
		context.restore();
	};
	requestAnimationFrame(computeNextFrame);
};