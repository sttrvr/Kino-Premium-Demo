document.addEventListener('DOMContentLoaded', () => {
  // Create snowflakes container
  const snowflakesContainer = document.createElement('div');
  snowflakesContainer.className = 'snowflakes-container';
  document.body.appendChild(snowflakesContainer);

  // Snowflake characters (you can use any Unicode snowflake or dot)
  const snowflakes = ['❄', '❅', '❆', '•', '*'];
  const colors = ['#ffffff', '#e6f7ff', '#cce7ff', '#f0f8ff', '#e6f2ff'];
  
  // Create snowflakes
  function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    
    // Random properties for each snowflake
    const size = Math.random() * 20 + 10; // Size between 10px and 30px
    const startPositionX = Math.random() * 100; // Random horizontal position
    const duration = Math.random() * 10 + 10; // Animation duration between 10s and 20s
    const delay = Math.random() * -20; // Start animation at different times
    const opacity = Math.random() * 0.6 + 0.3; // Opacity between 0.3 and 0.9
    const blur = Math.random() * 3; // Random blur effect
    const scale = Math.random() * 0.8 + 0.4; // Random scale between 0.4 and 1.2
    
    // Randomly decide if this snowflake will have a twinkling effect
    const willTwinkle = Math.random() > 0.7; // 30% chance to twinkle
    
    // Randomly select a snowflake character or use a dot
    const snowflakeChar = Math.random() > 0.3 
      ? snowflakes[Math.floor(Math.random() * snowflakes.length)] 
      : '•';
    
    // Set snowflake properties
    snowflake.textContent = snowflakeChar;
    snowflake.style.left = `${startPositionX}%`;
    snowflake.style.fontSize = `${size}px`;
    snowflake.style.animationDuration = `${duration}s`;
    snowflake.style.animationDelay = `${delay}s`;
    snowflake.style.opacity = opacity;
    snowflake.style.filter = `blur(${blur}px)`;
    snowflake.style.transform = `scale(${scale})`;
    
    // Add a subtle shadow or glow for some snowflakes
    if (Math.random() > 0.7) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      snowflake.style.textShadow = `0 0 ${Math.random() * 5 + 5}px ${color}`;
    }
    
    // Add twinkling effect to some snowflakes
    if (willTwinkle) {
      const twinkleDuration = Math.random() * 3 + 2; // Twinkle duration between 2s and 5s
      snowflake.style.animation += `, twinkle ${twinkleDuration}s infinite alternate`;
      
      // Add keyframes for twinkling
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes twinkle {
          0% { opacity: 0.3; text-shadow: 0 0 5px rgba(255, 255, 255, 0.3); }
          100% { opacity: 1; text-shadow: 0 0 20px rgba(255, 255, 255, 0.9); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add the snowflake to the container
    snowflakesContainer.appendChild(snowflake);
    
    // Remove snowflake after it falls
    setTimeout(() => {
      snowflake.remove();
    }, (duration * 1000) + 1000);
  }
  
  // Create initial snowflakes
  const snowflakeCount = Math.min(50, Math.floor(window.innerWidth / 20)); // Adjust count based on screen size
  for (let i = 0; i < snowflakeCount; i++) {
    // Stagger the creation of snowflakes
    setTimeout(createSnowflake, i * 300);
  }
  
  // Create new snowflakes periodically
  setInterval(() => {
    if (Math.random() > 0.7) { // 70% chance to create a new snowflake
      createSnowflake();
    }
  }, 1000);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    // You can adjust snowflake count based on window size if needed
  });
});
