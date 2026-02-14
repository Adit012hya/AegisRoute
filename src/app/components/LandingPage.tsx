import { useNavigate } from 'react-router';
import LiquidEther from './visuals/LiquidEther';
import { motion } from 'motion/react';
import Shuffle from './visuals/Shuffle';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
            {/* Background Effect */}
            <div className="absolute inset-0 z-0">
                <LiquidEther
                    colors={['#5227FF', '#FF9FFC', '#B19EEF']}
                    mouseForce={20}
                    cursorSize={100}
                    isViscous
                    viscous={30}
                    iterationsViscous={32}
                    iterationsPoisson={32}
                    resolution={0.5}
                    isBounce={false}
                    autoDemo
                    autoSpeed={0.5}
                    autoIntensity={2.2}
                    takeoverDuration={0.25}
                    autoResumeDelay={3000}
                    autoRampDuration={0.6}
                    color0="#5227FF"
                    color1="#FF9FFC"
                    color2="#B19EEF"
                />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-white px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center"
                >
                    <div className="flex items-center gap-2 mb-6 justify-center">
                        <Shuffle
                            text="AegisRoute"
                            shuffleDirection="right"
                            duration={0.35}
                            animationMode="evenodd"
                            shuffleTimes={1}
                            ease="power3.out"
                            stagger={0.03}
                            threshold={0.1}
                            triggerOnce={true}
                            triggerOnHover
                            respectReducedMotion={true}
                            loop={false}
                            loopDelay={0}
                            className="text-4xl md:text-6xl font-black text-slate-200 tracking-widest"
                        />
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.9 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="text-xl md:text-2xl text-slate-100 max-w-2xl mx-auto mb-12 font-semibold drop-shadow-lg"
                    >
                        Walk smarter, not just faster.
                    </motion.p>

                    <motion.div className="flex justify-center mt-8">
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                            onClick={() => navigate('/app')}
                            className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-2xl font-black transition-all shadow-2xl shadow-emerald-500/40 tracking-wider uppercase"
                        >
                            Launch
                        </motion.button>
                    </motion.div>
                </motion.div>

                {/* Footer Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-8 text-sm text-slate-500 uppercase tracking-widest pointer-events-none"
                >
                    Securing every mile with advanced heuristics
                </motion.div>
            </div>

            {/* Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-[5]"></div>
        </div>
    );
};

export default LandingPage;
