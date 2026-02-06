import { NodeIO, Document } from '@gltf-transform/core';
import { mergeDocuments } from '@gltf-transform/functions';
import { mkdirSync } from 'fs';
import { join } from 'path';

const io = new NodeIO();
const BASE = 'C:\\3d_assets\\3D Asset';
const OUT = join(BASE, 'assembled');
mkdirSync(OUT, { recursive: true });

// Euler XYZ (degrees) → quaternion [x,y,z,w]
function euler(rx, ry, rz) {
  const d = Math.PI / 180;
  rx *= d; ry *= d; rz *= d;
  const cx = Math.cos(rx/2), sx = Math.sin(rx/2);
  const cy = Math.cos(ry/2), sy = Math.sin(ry/2);
  const cz = Math.cos(rz/2), sz = Math.sin(rz/2);
  return [
    sx*cy*cz - cx*sy*sz,
    cx*sy*cz + sx*cy*sz,
    cx*cy*sz - sx*sy*cz,
    cx*cy*cz + sx*sy*sz
  ];
}

async function assemble(name, parts) {
  console.log(`\n=== ${name} (${parts.length} parts) ===`);
  let mainDoc = null;

  for (const p of parts) {
    const path = join(BASE, name, p.file);
    try {
      const doc = await io.read(path);
      for (const scene of doc.getRoot().listScenes()) {
        for (const node of scene.listChildren()) {
          node.setName(p.label);
          if (p.t) node.setTranslation(p.t);
          if (p.r) node.setRotation(euler(...p.r));
        }
      }
      if (!mainDoc) { mainDoc = doc; }
      else { await mergeDocuments(mainDoc, doc); }
      console.log(`  + ${p.label}`);
    } catch (e) {
      console.error(`  ! ${p.file}: ${e.message}`);
    }
  }

  // Consolidate scenes
  const scenes = mainDoc.getRoot().listScenes();
  if (scenes.length > 1) {
    const main = scenes[0];
    for (let i = 1; i < scenes.length; i++) {
      for (const child of [...scenes[i].listChildren()]) {
        main.addChild(child);
      }
      scenes[i].dispose();
    }
  }

  // Consolidate buffers into one (GLB requires 0-1 buffers)
  const root = mainDoc.getRoot();
  const buffers = root.listBuffers();
  if (buffers.length > 1) {
    const mainBuf = buffers[0];
    root.listAccessors().forEach(a => a.setBuffer(mainBuf));
    for (let i = buffers.length - 1; i > 0; i--) {
      buffers[i].dispose();
    }
  }

  const out = join(OUT, `${name}_assembled.glb`);
  await io.write(out, mainDoc);
  console.log(`  -> ${out}`);
  return out;
}

// ====== ASSEMBLY CONFIGS ======
// All translations in METERS (mesh coords are cm, node scale=0.01)

// 1. Suspension - coilover shock absorber
await assemble('Suspension', [
  { file: 'BASE.glb',   label: 'Base Mount',   t: [0, 0, 0] },
  { file: 'ROD.glb',    label: 'Damper Rod',    t: [0, 0.028, 0] },
  { file: 'SPRING.glb', label: 'Coil Spring',   t: [0, -0.005, 0] },
  { file: 'NIT.glb',    label: 'Retainer Ring', t: [0, 0.080, 0] },
  { file: 'NUT.glb',    label: 'Lock Nut',      t: [0, 0.092, 0] },
]);

// 2. V4 Engine - inline 4 pistons on crankshaft
const v4 = [{ file: 'Crankshaft.glb', label: 'Crankshaft', t: [0, 0, 0] }];
[0.08, 0.22, 0.36, 0.50].forEach((cx, i) => {
  const n = i + 1;
  v4.push({ file: 'Connecting Rod.glb',     label: `ConRod_${n}`,     t: [cx, 0.21, 0] });
  v4.push({ file: 'Connecting Rod Cap.glb', label: `ConRodCap_${n}`, t: [cx, 0.04, 0] });
  v4.push({ file: 'Conrod Bolt.glb',        label: `Bolt_${n}`,       t: [cx+0.025, 0.03, 0] });
  v4.push({ file: 'Piston.glb',             label: `Piston_${n}`,     t: [cx, 0.22, 0] });
  v4.push({ file: 'Piston Ring.glb',        label: `Ring_${n}`,       t: [cx, 0.29, 0] });
  v4.push({ file: 'Piston Pin.glb',         label: `Pin_${n}`,        t: [cx, 0.235, 0.04] });
});
await assemble('V4_Engine', v4);

// 3. Machine Vice
await assemble('Machine Vice', [
  { file: 'Part8-grundplatte.glb',   label: 'Base Plate',      t: [0, 0, 0] },
  { file: 'Part2 Feste Backe.glb',   label: 'Fixed Jaw',       t: [0.11, 0, 0.01] },
  { file: 'Part3-lose backe.glb',    label: 'Moving Jaw',      t: [0.055, 0.025, 0.01] },
  { file: 'Part7-TrapezSpindel.glb', label: 'Lead Screw',      t: [0.035, 0.025, 0.12] },
  { file: 'Part4 spindelsockel.glb', label: 'Spindle Mount',   t: [0.14, 0, 0.01] },
  { file: 'Part5-Spannbacke.glb',    label: 'Jaw Face 1',      t: [0.105, 0.035, 0.025] },
  { file: 'Part5-Spannbacke.glb',    label: 'Jaw Face 2',      t: [0.06, 0.035, 0.01] },
  { file: 'Part6-fuhrungschiene.glb', label: 'Guide Rail Top',  t: [0.065, 0.08, 0.005] },
  { file: 'Part6-fuhrungschiene.glb', label: 'Guide Rail Bot',  t: [0.065, -0.015, 0.005] },
  { file: 'Part1 Fuhrung.glb',       label: 'Guide',           t: [0.02, 0.02, 0.005] },
  { file: 'Part1.glb',               label: 'Handle Block',    t: [0.035, 0.025, 0.14] },
  { file: 'Part9-Druckhulse.glb',    label: 'Pressure Sleeve', t: [0.035, 0.025, 0.13] },
]);

// 4. Robot Arm - 6DOF articulated
await assemble('Robot Arm', [
  { file: 'base.glb',  label: 'Base',        t: [0, 0, 0] },
  { file: 'Part2.glb', label: 'Shoulder',     t: [0, 0.10, 0.06] },
  { file: 'Part3.glb', label: 'Upper Arm',    t: [0.05, 0.28, 0.12], r: [0, 0, 50] },
  { file: 'Part4.glb', label: 'Forearm',      t: [-0.12, 0.42, 0.18], r: [0, 0, -20] },
  { file: 'Part5.glb', label: 'Wrist',        t: [-0.18, 0.50, 0.28] },
  { file: 'Part6.glb', label: 'Wrist Joint',  t: [-0.20, 0.52, 0.22] },
  { file: 'Part7.glb', label: 'Effector',     t: [-0.23, 0.54, 0.20] },
  { file: 'Part8.glb', label: 'Gripper',      t: [-0.25, 0.55, 0.18] },
]);

// 5. Robot Gripper - gear-driven parallel gripper
await assemble('Robot Gripper', [
  { file: 'Base Plate.glb',           label: 'Base Plate',    t: [0, 0, 0] },
  { file: 'Base Mounting bracket.glb', label: 'Mount Bracket', t: [0, 0.055, 0] },
  { file: 'Base Gear.glb',            label: 'Drive Gear',    t: [0, 0.04, 0.003] },
  { file: 'Gear link 1.glb',          label: 'Gear Link 1',   t: [0, 0.03, 0.005] },
  { file: 'Gear link 2.glb',          label: 'Gear Link 2',   t: [0, 0.02, 0.005] },
  { file: 'Gripper.glb',              label: 'Gripper L',     t: [0, 0, 0.003] },
  { file: 'Gripper.glb',              label: 'Gripper R',     t: [0, 0, 0.003], r: [0, 180, 0] },
  { file: 'Link.glb',                 label: 'Link 1',        t: [0.003, 0.015, 0.003] },
  { file: 'Link.glb',                 label: 'Link 2',        t: [-0.003, 0.015, 0.003] },
  { file: 'Pin.glb',                  label: 'Pin 1',         t: [0, 0.04, 0.003] },
  { file: 'Pin.glb',                  label: 'Pin 2',         t: [0, 0.02, 0.003] },
  { file: 'Pin.glb',                  label: 'Pin 3',         t: [0, 0, 0.003] },
]);

// 6. Leaf Spring - automotive suspension
await assemble('Leaf Spring', [
  { file: 'Leaf-Layer.glb',           label: 'Leaf Stack',     t: [0, 0, 0] },
  { file: 'Clamp-Center.glb',         label: 'Center Clamp',   t: [0.08, 0, 0] },
  { file: 'Clamp-Primary.glb',        label: 'Primary Clamp',  t: [0.08, 0, 0.18] },
  { file: 'Clamp-Secondary.glb',      label: 'Secondary Clamp',t: [0.08, 0, -0.18] },
  { file: 'Support.glb',              label: 'Support',        t: [0.04, 0, 0] },
  { file: 'Support-Chassis.glb',      label: 'Chassis Mount',  t: [0, 0, -0.45] },
  { file: 'Support-Chassis Rigid.glb',label: 'Rigid Mount',    t: [0, 0, 0.42] },
  { file: 'Support-Rubber.glb',       label: 'Rubber Bush L',  t: [0, 0, -0.50] },
  { file: 'Support-Rubber 60mm.glb',  label: 'Rubber Bush R',  t: [0, 0, 0.46] },
]);

// 7. Drone - quadcopter
const drone = [
  { file: 'Main frame.glb',     label: 'Frame Left',  t: [0, 0, 0] },
  { file: 'Main frame_MIR.glb', label: 'Frame Right', t: [0, 0, 0] },
  { file: 'xyz.glb',            label: 'Camera',      t: [0, 0.08, -0.015] },
];
// 4 motor pods at arm tips
const arms = [
  { lbl: 'FR', x: 0.055,  y: 0.155 },
  { lbl: 'FL', x: -0.055, y: 0.155 },
  { lbl: 'RR', x: 0.055,  y: 0.015 },
  { lbl: 'RL', x: -0.055, y: 0.015 },
];
for (const a of arms) {
  drone.push({ file: 'Leg.glb',           label: `Leg_${a.lbl}`,    t: [a.x, a.y-0.01, 0] });
  drone.push({ file: 'Arm gear.glb',      label: `Motor_${a.lbl}`,  t: [a.x, a.y, 0] });
  drone.push({ file: 'Gearing.glb',       label: `Shaft_${a.lbl}`,  t: [a.x, a.y, 0] });
  drone.push({ file: 'Beater disc.glb',   label: `Disc_${a.lbl}`,   t: [a.x, a.y+0.022, 0] });
  drone.push({ file: 'Impellar Blade.glb',label: `Prop_${a.lbl}`,   t: [a.x, a.y+0.025, 0] });
  drone.push({ file: 'Nut.glb',           label: `Cap_${a.lbl}`,    t: [a.x, a.y+0.030, 0] });
}
drone.push({ file: 'Screw.glb', label: 'Screw', t: [0, 0.06, 0] });
await assemble('Drone', drone);

console.log('\n===== ALL ASSEMBLIES COMPLETE =====');
