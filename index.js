const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (x, min, max) => x < min ? min : (x > max ? max : x);
const integrate = (y, f, h) => [y[0] + f[0] * h, y[1] + f[1] * h];

const simulate = (particles, update, timestep, settings, duration = timestep) => {
	for (let t = 0; t < duration; t += timestep) {
		update(particles, timestep, settings);
	}
};

const linearInterpolation = (x, x1, y1, x2, y2) => {
	return (y2 - y1) / (x2 - x1) * (x - x1) + y1;
};

const createParticles = (settings) => {
	const particles = [];
	for (let i = 0; i < settings.numberOfParticles; i++) {
		const radius = random(...settings.initialRadius);
		particles.push({
			position: [settings.canvas.width / 2, settings.canvas.height / 2],
			velocity: [0, 0],
			acceleration: [0, 0],
			mass: 1,
			radius: radius,
			colour: { h: 0, s: 100, l: 20, a: 100 },
			time: 0,
			duration: random(...settings.duration),
			initialRadius: radius
		});
	}
	return particles;
};

const updateParticles = (particles, timestep, settings) => {
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		p.time += timestep;
		if (p.time >= p.duration) {
			p.time = 0;
			p.radius = random(...settings.initialRadius);
			p.initialRadius = p.radius;
			p.position = [
				settings.canvas.width / 2 + random(-10, 10),
				settings.canvas.height / 2 + random(-10, 10)
			];
			p.velocity = [0, 0];
		} else {
			p.radius = linearInterpolation(p.time, 0, p.initialRadius, p.duration, 0);
		}

		const jitter = linearInterpolation(p.time, 0, 200, p.duration, 600);
		const force = [random(-jitter, jitter), random(0, 2 * jitter)];
		p.acceleration = force.map(f => f / p.mass);

		p.velocity = integrate(p.velocity, p.acceleration, timestep);
		const maxSpeed = 100;
		p.velocity = p.velocity.map(v => clamp(v, -maxSpeed, maxSpeed));

		p.position = integrate(p.position, p.velocity, timestep);

		p.colour.h = linearInterpolation(p.time, 0, 30, p.duration, 0);
		p.colour.l = linearInterpolation(p.time, 0, 70, p.duration, 30);
	}
};

const drawParticles = (particles, settings) => {
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];

		const gradient = settings.context.createRadialGradient(
			p.position[0],
			p.position[1],
			2 * p.radius,
			p.position[0],
			p.position[1],
			15 * p.radius
		);

		let alpha = 20;
		const tAlpha = 0.1;
		if (p.time < tAlpha) {
			alpha = linearInterpolation(p.time, 0, 0, tAlpha, 20);
		}

		const c = p.colour;
		gradient.addColorStop(0, `hsl(${c.h}deg, ${c.s}%, ${c.l}%, ${alpha}%)`);
		gradient.addColorStop(1, `hsl(${c.h}deg, ${c.s}%, ${2}%, 10%)`);
		settings.context.fillStyle = gradient;
		settings.context.fillRect(0, 0, settings.canvas.width, settings.canvas.height);
	}

	for (let i = 0; i < particles.length; i++) {
		settings.context.beginPath();
		const p = particles[i];
		settings.context.arc(...p.position, p.radius, 0, 2 * Math.PI);
		const c = p.colour;
		settings.context.fillStyle = `hsl(${c.h}deg, ${c.s}%, ${c.l}%, ${c.a}%)`;
		settings.context.fill();
	}
};

window.onload = () => {
	const settings = {};
	settings.numberOfParticles = 50;
	settings.duration = [2, 4];
	settings.initialRadius = [40, 80];
	settings.canvas = document.querySelector("canvas");
	settings.context = settings.canvas.getContext("2d");

	window.addEventListener("resize", () => {
		settings.canvas.width = window.innerWidth;
		settings.canvas.height = window.innerHeight;
	});

	window.dispatchEvent(new Event("resize"));

	const particles = createParticles(settings);

	const physics = {
		timeMultiplier: 1,
		accumulatedTime: 0,
		timestep: 1 / 120
	};

	simulate(particles, updateParticles, physics.timestep, settings, 10);

	let previousTime = performance.now() / 1000;
	const computeNextFrame = (time) => {
		requestAnimationFrame(computeNextFrame);

		time /= 1000;
		const frameTime = (time - previousTime) * physics.timeMultiplier;
		previousTime = time;
		physics.accumulatedTime += frameTime;
		physics.accumulatedTime = Math.min(0.25, physics.accumulatedTime);

		while (physics.accumulatedTime > physics.timestep) {
			physics.accumulatedTime -= physics.timestep;
			physics.time += physics.timestep;
			simulate(particles, updateParticles, physics.timestep, settings);
		}
		
		settings.context.fillStyle = "hsl(0deg, 0%, 20%)";
		settings.context.fillRect(0, 0, settings.canvas.width, settings.canvas.height);

		settings.context.save();
		settings.context.scale(1, -1);
		settings.context.translate(0, -settings.canvas.height);
		drawParticles(particles, settings);
		settings.context.restore();
	};
	requestAnimationFrame(computeNextFrame);
};