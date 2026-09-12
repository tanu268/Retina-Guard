import { motion } from 'framer-motion';
import { Code2, Link2 } from 'lucide-react';

const TEAM = [
  { name: 'Yash Singh Thakur', role: 'Team Leader', img: 1 },
  { name: 'Tanu Namdeo', role: 'Frontend & AIOps', img: 5 },
  { name: 'Shrusti Shingade', role: 'Contributor', img: 9 },
  { name: 'Nikhil Somkuwar', role: 'Contributor', img: 12 },
  { name: 'Nitin Chadar', role: 'Contributor', img: 15 },
  { name: 'Priyanka Pandey', role: 'Contributor', img: 20 },
];

export function TeamSection() {
  return (
    <section id="team" className="relative py-24 lg:py-32 px-6 lg:px-12 bg-white border-t border-[#E5E7EB]">
      <div className="max-w-[1240px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="max-w-[620px] mb-14"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB] mb-3">
            Our Team
          </p>
          <h2 className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] text-[#111111]">
            Built by Glitch to Sight.
          </h2>
          <p className="mt-4 text-[16px] text-[#6B7280] leading-relaxed">
            Six people, one submission — Smart India Hackathon 2026, Problem Statement 26038.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {TEAM.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-[6px] border border-[#E5E7EB] p-5 flex flex-col items-center text-center"
            >
              <img
                src={`https://i.pravatar.cc/160?img=${member.img}`}
                alt=""
                aria-hidden="true"
                className="w-16 h-16 rounded-full object-cover mb-4 border border-[#E5E7EB]"
              />
              <p className="text-[13px] font-semibold text-[#111111] leading-snug">{member.name}</p>
              <p className="text-[12px] text-[#6B7280] mt-0.5">{member.role}</p>
              <div className="mt-3 flex items-center gap-3 text-[#6B7280]">
                <span aria-label={`${member.name} on LinkedIn`}><Link2 size={16} strokeWidth={1.75} /></span>
                <span aria-label={`${member.name} on GitHub`}><Code2 size={16} strokeWidth={1.75} /></span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
