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

    // ------- Minimal peripheral nerve extensions: shoulders, arms, hands -------
    // No human body, silhouette, skin, torso or humanoid model is used here.
    // These lightweight curves simply continue the existing spinal/nerve language.
    const armNerveExtensions = new THREE.Group();
    armNerveExtensions.name = 'armNerveExtensions';
    brain.add(armNerveExtensions);

    const nerveCoreMaterial = new THREE.MeshBasicMaterial({
      color:0xedffff,
      transparent:true,
      opacity:.98,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    const nerveMaterial = new THREE.MeshBasicMaterial({
      color:0x54e5ff,
      transparent:true,
      opacity:.94,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    const nerveGlowMaterial = new THREE.MeshBasicMaterial({
      color:0x27d7ff,
      transparent:true,
      opacity:.22,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    function addNerve(points,radius=.014,material=nerveMaterial){
      const curve = new THREE.CatmullRomCurve3(points,false,'catmullrom',.45);

      const halo = new THREE.Mesh(
        new THREE.TubeGeometry(curve,Math.max(28,points.length*16),radius*2.8,7,false),
        nerveGlowMaterial
      );
      halo.renderOrder = 6;
      halo.raycast = () => {};
      armNerveExtensions.add(halo);

      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve,Math.max(28,points.length*16),radius,8,false),
        material
      );
      tube.renderOrder = 7;
      tube.raycast = () => {};
      armNerveExtensions.add(tube);
      return tube;
    }

    function addNerveTip(position,radius=.018){
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(radius,10,10),
        new THREE.MeshBasicMaterial({
          color:0xeaffff,
          transparent:true,
          opacity:.92,
          depthWrite:false,
          blending:THREE.AdditiveBlending
        })
      );
      tip.position.copy(position);
      tip.renderOrder = 8;
      tip.raycast = () => {};
      armNerveExtensions.add(tip);
    }

    // Preserve the existing central spinal continuation under the brain stem.
    addNerve([
      new THREE.Vector3(.10,-1.16,.24),
      new THREE.Vector3(.06,-1.38,.27),
      new THREE.Vector3(.03,-1.62,.29),
      new THREE.Vector3(.01,-1.88,.31),
      new THREE.Vector3(0,-2.14,.32),
      new THREE.Vector3(0,-2.38,.33),
      new THREE.Vector3(0,-2.58,.34)
    ],.046,nerveCoreMaterial);

    function addArmNerves(side){
      const shoulder = new THREE.Vector3(side*.70,-1.40,.36);
      const upperArm = new THREE.Vector3(side*.92,-1.55,.39);
      const elbow = new THREE.Vector3(side*1.15,-1.72,.42);
      const forearm = new THREE.Vector3(side*1.36,-1.91,.44);
      const wrist = new THREE.Vector3(side*1.54,-2.08,.46);
      const palm = new THREE.Vector3(side*1.68,-2.16,.47);

      // Brachial-plexus-like branch from the lower spinal / brain-stem region.
      addNerve([
        new THREE.Vector3(side*.035,-1.48,.30),
        new THREE.Vector3(side*.18,-1.45,.31),
        new THREE.Vector3(side*.37,-1.42,.33),
        new THREE.Vector3(side*.54,-1.40,.35),
        shoulder
      ],.024,nerveCoreMaterial);

      // Main peripheral path through upper arm, forearm, wrist and palm.
      addNerve([shoulder,upperArm,elbow,forearm,wrist,palm],.019,nerveCoreMaterial);

      // Two fine companion branches keep the arm readable without creating a body shell.
      addNerve([
        shoulder.clone().add(new THREE.Vector3(side*.015,.035,.025)),
        upperArm.clone().add(new THREE.Vector3(side*.020,.030,.035)),
        elbow.clone().add(new THREE.Vector3(side*.018,.018,.042)),
        forearm.clone().add(new THREE.Vector3(side*.014,.012,.035)),
        wrist.clone().add(new THREE.Vector3(side*.010,.006,.022))
      ],.0085);

      addNerve([
        shoulder.clone().add(new THREE.Vector3(-side*.014,-.030,-.020)),
        upperArm.clone().add(new THREE.Vector3(-side*.018,-.026,-.030)),
        elbow.clone().add(new THREE.Vector3(-side*.016,-.016,-.036)),
        forearm.clone().add(new THREE.Vector3(-side*.012,-.010,-.030)),
        wrist.clone().add(new THREE.Vector3(-side*.009,-.005,-.020))
      ],.0085);

      // Minimal hand fan: five subtle digital nerve endings.
      const fingerSpread = [.115,.058,0,-.058,-.115];
      const fingerLength = [.20,.25,.28,.25,.20];
      fingerSpread.forEach((offset,index)=>{
        const handBase = new THREE.Vector3(
          palm.x + side*.045,
          palm.y + offset*.42,
          palm.z + .006
        );
        const fingertip = new THREE.Vector3(
          handBase.x + side*fingerLength[index],
          handBase.y + offset*.40,
          handBase.z + .018
        );

        addNerve([
          palm,
          new THREE.Vector3(palm.x+side*.055,palm.y+offset*.22,palm.z+.010),
          handBase,
          fingertip
        ],.0065);
        addNerveTip(fingertip,.015);
      });

      // Small thumb branch.
      const thumbBase = new THREE.Vector3(palm.x+side*.035,palm.y-.075,palm.z+.010);
      const thumbTip = new THREE.Vector3(palm.x+side*.20,palm.y-.145,palm.z+.030);
      addNerve([palm,thumbBase,thumbTip],.007);
      addNerveTip(thumbTip,.016);
    }

    addArmNerves(-1);
    addArmNerves(1);


`;
html = html.slice(0,start) + replacement + html.slice(end);
html = html.replace("        if(hover){ hover.material.emissiveIntensity=.34; hover.scale.multiplyScalar(1/1.035); }", "        if(hover){ hover.material.emissiveIntensity=.12; hover.scale.multiplyScalar(1/1.012); }");
html = html.replace("        if(hover){ hover.material.emissiveIntensity=1.15; hover.scale.multiplyScalar(1.035); const d=hover.userData; selectedData=d;", "        if(hover){ hover.material.emissiveIntensity=.72; hover.scale.multiplyScalar(1.012); const d=hover.userData.portfolioLobe || hover.userData; selectedData=d;");
html = html.replace("if(hit){ const d=hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }", "if(hit){ const d=hit.object.userData.portfolioLobe || hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }");

// The source now owns the refined pen animation and the horizontal orbit.
 // Remove only the brain group's visual roll so the orbit stays perfectly level in screen/world space.
html = html.replace("brain.rotation.z = Math.sin(t*.45)*.016;", "brain.rotation.z = 0;");

html = html.replace('</body>', '<!-- Anatomical brain asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0. No human body asset is loaded. https://github.com/itayinbarr/brainproject -->\n</body>');
fs.writeFileSync(path, html);
console.log('Applied anatomical brain with minimal peripheral arm/hand nerve extensions and level horizontal neural orbit.');
