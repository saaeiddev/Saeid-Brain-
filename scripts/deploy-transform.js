const fs = require('fs');
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

// Add production GLTF + Draco loaders.
html = html.replace(
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\n    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);

const start = html.indexOf('    // ------- Procedural anatomical brain -------');
const end = html.indexOf('    // Neural orbit particles');
if (start < 0 || end < 0 || end <= start) throw new Error('Brain block markers not found');

const replacement = `    // ------- High-detail anatomical brain asset -------
    // Anatomical asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0.
    // Source: https://github.com/itayinbarr/brainproject
    const brain = new THREE.Group();
    brain.visible = false; brain.scale.setScalar(.01); brain.position.set(0,.0,0); scene.add(brain);

    const lobeData = [
      { id:'frontal', name:'Frontal Lobe', dest:'Personal Website', url:'https://amirsaeiddehghan.ir/', color:0x39ddff },
      { id:'parietal', name:'Parietal Lobe', dest:'Second Personal Website', url:'https://saaeiddev.github.io/Amir-Saeid-Dehghan-Website-2-/', color:0xa968ff },
      { id:'temporal', name:'Temporal Lobe', dest:'Behance · Amir Saeid', url:'https://www.behance.net/amirsaeid', color:0xff5db3 },
      { id:'occipital', name:'Occipital Lobe', dest:'YouTube · @saeidworld', url:'https://www.youtube.com/@saeidworld', color:0xffb747 }
    ];
    const interactive = [];
    let anatomicalModel = null;

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);

    function lobeForObject(obj){
      const e = obj.userData || {};
      const text = [obj.name, e.bx_label, e.bx_region, e.bx_cat, e.bx_id].filter(Boolean).join(' ').toLowerCase();
      if(text.includes('frontal')) return lobeData[0];
      if(text.includes('parietal')) return lobeData[1];
      if(text.includes('temporal')) return lobeData[2];
      if(text.includes('occipital')) return lobeData[3];
      return null;
    }

    const BRAIN_MODEL_URL = 'https://raw.githubusercontent.com/itayinbarr/brainproject/main/brain-atlas/models/brain.glb';
    gltfLoader.load(BRAIN_MODEL_URL, gltf => {
      anatomicalModel = gltf.scene;
      const box = new THREE.Box3().setFromObject(anatomicalModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      anatomicalModel.position.sub(center);
      const fit = 4.25 / Math.max(size.x,size.y,size.z);
      anatomicalModel.scale.setScalar(fit);
      anatomicalModel.rotation.set(-0.08, -0.34, 0.02);

      anatomicalModel.traverse(obj => {
        if(!obj.isMesh) return;
        obj.castShadow = true; obj.receiveShadow = true;
        const lobe = lobeForObject(obj);
        if(lobe){
          obj.userData.portfolioLobe = lobe;
          obj.userData.name = lobe.name;
          obj.userData.dest = lobe.dest;
          obj.userData.url = lobe.url;
          obj.userData.color = lobe.color;
          interactive.push(obj);
          const base = new THREE.Color(lobe.color);
          const old = obj.material;
          obj.material = new THREE.MeshPhysicalMaterial({
            color: base.clone().lerp(new THREE.Color(0xd8a8a8), .62),
            map: old?.map || null,
            normalMap: old?.normalMap || null,
            roughness: .48,
            metalness: 0,
            clearcoat: .22,
            clearcoatRoughness: .45,
            emissive: base,
            emissiveIntensity: .12,
            transparent: false
          });
        } else if(obj.material){
          const old = obj.material;
          obj.material = old.clone();
          obj.material.roughness = Math.max(.4, obj.material.roughness ?? .5);
        }
      });
      brain.add(anatomicalModel);
    }, undefined, err => {
      console.error('Anatomical brain model failed to load', err);
      document.querySelector('.brain-title p').textContent = 'Anatomical model could not load. Please refresh.';
    });

`;
html = html.slice(0,start) + replacement + html.slice(end);

// The real anatomical model is already detailed; remove the old procedural cerebellum animation dependency.
html = html.replace("        if(hover){ hover.material.emissiveIntensity=.34; hover.scale.multiplyScalar(1/1.035); }", "        if(hover){ hover.material.emissiveIntensity=.12; hover.scale.multiplyScalar(1/1.012); }");
html = html.replace("        if(hover){ hover.material.emissiveIntensity=1.15; hover.scale.multiplyScalar(1.035); const d=hover.userData; selectedData=d;", "        if(hover){ hover.material.emissiveIntensity=.72; hover.scale.multiplyScalar(1.012); const d=hover.userData.portfolioLobe || hover.userData; selectedData=d;");
html = html.replace("if(hit){ const d=hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }", "if(hit){ const d=hit.object.userData.portfolioLobe || hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }");

// Slow 360-degree barrel roll so the handwritten name naturally rotates into view.
html = html.replace(
  "pen.rotation.y = -.32 + Math.sin(t*.55)*.055;\n        pen.rotation.x = .18 + Math.sin(t*.7)*.025;",
  "pen.rotation.y = -.32 + Math.sin(t*.38)*.045;\n        pen.rotation.x = .18 + (t * .32) % (Math.PI * 2);"
);

// Keep credits available in source without adding UI clutter.
html = html.replace('</body>', '<!-- Anatomical brain asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0. https://github.com/itayinbarr/brainproject -->\n</body>');

fs.writeFileSync(path, html);
console.log('Applied anatomical brain + rotating pen production transform.');
