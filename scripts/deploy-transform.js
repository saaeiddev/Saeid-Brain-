const fs = require('fs');
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

// Add production GLTF + Draco loaders.
html = html.replace(
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\n    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);

const start = html.indexOf('    // ------- Procedural anatomical brain -------');
let end = html.indexOf('    // Flat neural orbit: perfectly level around the brain, never tilted.');
if (end < 0) end = html.indexOf('    // Neural orbit particles');
if (start < 0 || end < 0 || end <= start) throw new Error('Brain block markers not found');

const replacement = `    // ------- High-detail anatomical brain asset -------
    // Anatomical asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0.
    // Source: https://github.com/itayinbarr/brainproject
    const brain = new THREE.Group();
    brain.visible = false; brain.scale.setScalar(.01); brain.position.set(0,-.18,0); scene.add(brain);

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
      const fit = 4.25 / Math.max(size.x,size.y,size.z);
      anatomicalModel.scale.setScalar(fit);
      anatomicalModel.position.copy(center).multiplyScalar(-fit);
      anatomicalModel.rotation.set(-0.08, -0.34, 0.02);

      anatomicalModel.traverse(obj => {
        if(!obj.isMesh) return;
        obj.castShadow = true; obj.receiveShadow = true;
        const lobe = lobeForObject(obj);
        if(lobe){
          obj.userData.portfolioLobe = lobe;
          obj.userData.id = lobe.id;
          obj.userData.name = lobe.name;
          obj.userData.dest = lobe.dest;
          obj.userData.url = lobe.url;
          obj.userData.color = lobe.color;
          interactive.push(obj);
          const base = new THREE.Color(lobe.color);
          const old = obj.material;
          obj.material = new THREE.MeshPhysicalMaterial({
            color: base.clone().lerp(new THREE.Color(0xd8a8a8), .62), map: old?.map || null, normalMap: old?.normalMap || null,
            roughness: .48, metalness: 0, clearcoat: .22, clearcoatRoughness: .45, emissive: base, emissiveIntensity: .12, transparent: false
          });
        } else if(obj.material){
          const old = obj.material; obj.material = old.clone(); obj.material.roughness = Math.max(.4, obj.material.roughness ?? .5);
        }
      });
      brain.add(anatomicalModel);
    }, undefined, err => {
      console.error('Anatomical brain model failed to load', err);
      document.querySelector('.brain-title p').textContent = 'Anatomical model could not load. Please refresh.';
    });

    // ------- Original central spinal cord only -------
    // Keep the anatomical brain as the hero object. No body, arms, hands,
    // peripheral branches, silhouette, skin mesh, torso or humanoid model.
    const spinalCord = new THREE.Group();
    spinalCord.name = 'spinalCord';
    brain.add(spinalCord);

    const spinalCoreMaterial = new THREE.MeshBasicMaterial({
      color:0xedffff,
      transparent:true,
      opacity:1,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    const spinalGlowMaterial = new THREE.MeshBasicMaterial({
      color:0x27d7ff,
      transparent:true,
      opacity:.24,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    function addSpinalCord(points,radius=.050){
      const curve = new THREE.CatmullRomCurve3(points,false,'catmullrom',.45);

      const glow = new THREE.Mesh(
        new THREE.TubeGeometry(curve,96,radius*2.8,8,false),
        spinalGlowMaterial
      );
      glow.renderOrder = 6;
      glow.raycast = () => {};
      spinalCord.add(glow);

      const core = new THREE.Mesh(
        new THREE.TubeGeometry(curve,96,radius,10,false),
        spinalCoreMaterial
      );
      core.renderOrder = 7;
      core.raycast = () => {};
      spinalCord.add(core);
    }

    // Central continuation directly below the brain stem — and nothing else.
    addSpinalCord([
      new THREE.Vector3(.10,-1.16,.24),
      new THREE.Vector3(.06,-1.38,.27),
      new THREE.Vector3(.03,-1.62,.29),
      new THREE.Vector3(.01,-1.88,.31),
      new THREE.Vector3(0,-2.15,.32),
      new THREE.Vector3(0,-2.43,.33),
      new THREE.Vector3(0,-2.72,.34)
    ]);


`;
html = html.slice(0,start) + replacement + html.slice(end);
html = html.replace("        if(hover){ hover.material.emissiveIntensity=.34; hover.scale.multiplyScalar(1/1.035); }", "        if(hover){ hover.material.emissiveIntensity=.12; hover.scale.multiplyScalar(1/1.012); }");
html = html.replace("        if(hover){ hover.material.emissiveIntensity=1.15; hover.scale.multiplyScalar(1.035); const d=hover.userData; selectedData=d;", "        if(hover){ hover.material.emissiveIntensity=.72; hover.scale.multiplyScalar(1.012); const d=hover.userData.portfolioLobe || hover.userData; selectedData=d;");
html = html.replace("if(hit){ const d=hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }", "if(hit){ const d=hit.object.userData.portfolioLobe || hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }");

// The source now owns the refined pen animation and the horizontal orbit.
 // Remove only the brain group's visual roll so the orbit stays perfectly level in screen/world space.
html = html.replace("brain.rotation.z = Math.sin(t*.45)*.016;", "brain.rotation.z = 0;");

html = html.replace('</body>', '<!-- Anatomical brain asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0. https://github.com/itayinbarr/brainproject -->\n</body>');
fs.writeFileSync(path, html);
console.log('Applied anatomical brain with original central spinal cord only, rotating pen, and level horizontal neural orbit.');
