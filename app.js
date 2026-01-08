const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"
const LINES = "#005f00ff"
const FILL = "#11aa33"

game.width = 800
game.height = 800

const ctx = game.getContext("2d")

function clear(){
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, game.width, game.height)
}

function screen(p){
    return { x: (p.x+1)*0.5*game.width, y: (1-(p.y+1)*0.5)*game.height }
}

function project({x, y, z}){
    return { x:x/z, y:y/z, z }
}

function translate({x, y, z}, t){
    return { x:x+t.x, y:y+t.y, z:z+t.z }
}

function translate_z({x, y, z}, dz){
    return { x, y, z:z+dz }
}

function rotate_xz({x, y, z}, a){
    const c=Math.cos(a), s=Math.sin(a)
    return { x:x*c-z*s, y, z:x*s+z*c }
}

function rotate_yz({x, y, z}, a){
    const c=Math.cos(a), s=Math.sin(a)
    return { x, y:y*c-z*s, z:y*s+z*c }
}

function dot(a,b){ return a.x*b.x+a.y*b.y+a.z*b.z }
function sub(a,b){ return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z} }
function cross(a,b){
    return {
        x:a.y*b.z-a.z*b.y,
        y:a.z*b.x-a.x*b.z,
        z:a.x*b.y-a.y*b.x
    }
}
function normalize(v){
    const l=Math.hypot(v.x,v.y,v.z)
    return {x:v.x/l,y:v.y/l,z:v.z/l}
}

const camera = { pos:{x:0,y:0,z:-3}, yaw:0, pitch:0 }
const lightDir = normalize({x: 0,y:0,z:-0.5})

function to_camera(p){
    let v = translate(p, { x:-camera.pos.x, y:-camera.pos.y, z:-camera.pos.z })
    v = rotate_xz(v, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)
    return v
}

let drawLines=false
let drawTextures=false
let drawLighting=false

toggleLines.onclick=()=>drawLines=!drawLines
toggleTextures.onclick=()=>drawTextures=!drawTextures
toggleLighting.onclick=()=>drawLighting=!drawLighting

function draw_textured_triangle(ctx, img, p0, p1, p2, uv0, uv1, uv2){
    const x0=p0.x,y0=p0.y,x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y
    const u0=uv0.x*img.width,v0=uv0.y*img.height
    const u1=uv1.x*img.width,v1=uv1.y*img.height
    const u2=uv2.x*img.width,v2=uv2.y*img.height
    const denom=(u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1))
    if(!denom) return
    const a=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/denom
    const b=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/denom
    const c=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/denom
    const d=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/denom
    const e=x0-a*u0-c*v0
    const f=y0-b*u0-d*v0
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x0,y0)
    ctx.lineTo(x1,y1)
    ctx.lineTo(x2,y2)
    ctx.closePath()
    ctx.clip()
    ctx.setTransform(a,b,c,d,e,f)
    ctx.drawImage(img,0,0)
    ctx.setTransform(1,0,0,1,0,0)
    ctx.restore()
}

function draw_polygon(points, uvs, texture, light){
    for(let i=0;i<points.length-2;i++){
        if(drawTextures && texture){
            draw_textured_triangle(
                ctx,texture,
                points[0],points[i+1],points[i+2],
                uvs[0],uvs[i+1],uvs[i+2]
            )
            if(drawLighting){
                ctx.fillStyle=`rgba(0,0,0,${1-light})`
                ctx.beginPath()
                ctx.moveTo(points[0].x,points[0].y)
                ctx.lineTo(points[i+1].x,points[i+1].y)
                ctx.lineTo(points[i+2].x,points[i+2].y)
                ctx.closePath()
                ctx.fill()
            }
        }else{
            const g=Math.floor(255*light)
            ctx.fillStyle=`rgb(${g*0.3},${g},${g*0.3})`
            ctx.beginPath()
            ctx.moveTo(points[0].x,points[0].y)
            ctx.lineTo(points[i+1].x,points[i+1].y)
            ctx.lineTo(points[i+2].x,points[i+2].y)
            ctx.closePath()
            ctx.fill()
        }
    }
    if(drawLines){
        ctx.strokeStyle=LINES
        ctx.beginPath()
        ctx.moveTo(points[0].x,points[0].y)
        for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y)
        ctx.closePath()
        ctx.stroke()
    }
}

const figures=[]

function add_cube(center,s){
    const h=s/2
    const vs=[
        {x:-h,y:-h,z:-h},{x:h,y:-h,z:-h},{x:h,y:h,z:-h},{x:-h,y:h,z:-h},
        {x:-h,y:-h,z:h},{x:h,y:-h,z:h},{x:h,y:h,z:h},{x:-h,y:h,z:h}
    ]
    const faces=[[0,1,2,3],[4,5,6,7],[0,4,5,1],[3,7,6,2],[1,5,6,2],[0,4,7,3]]
    const tris=[]
    for(const f of faces){
        const uv=[{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}]
        tris.push(
            {indices:[f[0],f[1],f[2]],uvs:[uv[0],uv[1],uv[2]]},
            {indices:[f[0],f[2],f[3]],uvs:[uv[0],uv[2],uv[3]]}
        )
    }
    figures.push({center,vs,faces:tris})
}

function add_pyramid(center,s,h){
    const hs=s/2,hh=h/2
    const vs=[
        {x:-hs,y:-hh,z:-hs},{x:hs,y:-hh,z:-hs},
        {x:hs,y:-hh,z:hs},{x:-hs,y:-hh,z:hs},
        {x:0,y:hh,z:0}
    ]
    const faces=[
        {indices:[0,1,2],uvs:[{x:0,y:1},{x:1,y:1},{x:1,y:0}]},
        {indices:[0,2,3],uvs:[{x:0,y:1},{x:1,y:0},{x:0,y:0}]}
    ]
    for(let i=0;i<4;i++)
        faces.push({indices:[i,(i+1)%4,4],uvs:[{x:0,y:1},{x:1,y:1},{x:.5,y:0}]})
    figures.push({center,vs,faces})
}

function sphereUV(u,v){
    return {x:(u-0.25+1)%1,y:v}
}

function add_sphere(center,r,lat=12,lon=20){
    const vs=[],faces=[]
    for(let i=0;i<=lat;i++){
        for(let j=0;j<=lon;j++){
            const u=j/lon,v=i/lat
            const phi=v*Math.PI,theta=u*Math.PI*2
            vs.push({
                x:Math.sin(phi)*Math.cos(theta)*r,
                y:Math.cos(phi)*r,
                z:Math.sin(phi)*Math.sin(theta)*r,
                u,v
            })
        }
    }
    const row=lon+1
    for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
        const a=i*row+j,b=a+row
        faces.push({
            indices:[a,b,a+1],
            uvs:[sphereUV(vs[a].u,vs[a].v),sphereUV(vs[b].u,vs[b].v),sphereUV(vs[a+1].u,vs[a+1].v)]
        })
        faces.push({
            indices:[a+1,b,b+1],
            uvs:[sphereUV(vs[a+1].u,vs[a+1].v),sphereUV(vs[b].u,vs[b].v),sphereUV(vs[b+1].u,vs[b+1].v)]
        })
    }
    figures.push({center,vs,faces})
}

function set_texture(f,src){
    const i=new Image()
    i.src=src
    i.onload=()=>f.texture=i
}

const keys={}
onkeydown=e=>keys[e.key]=true
onkeyup=e=>keys[e.key]=false

let md=false,lx=0,ly=0
game.onmousedown=e=>{md=true;lx=e.clientX;ly=e.clientY}
onmouseup=()=>md=false
onmousemove=e=>{
    if(!md) return
    camera.yaw-=(e.clientX-lx)*0.003
    camera.pitch-=(e.clientY-ly)*0.003
    camera.pitch=Math.max(-1.56,Math.min(1.56,camera.pitch))
    lx=e.clientX;ly=e.clientY
}

function drawLightPoint(){
    if(!drawLighting) return

    const p = to_camera({
        x: lightDir.x * 5,
        y: lightDir.y * 5,
        z: lightDir.z * 5
    })

    if(p.z <= 0) return

    const s = screen(project(p))

    ctx.fillStyle = "#ffff00"
    ctx.beginPath()
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2)
    ctx.fill()
}

function lightDir_camera(){
    let v = rotate_xz(lightDir, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)
    return normalize(v)
}

function frame(){
    clear()
    let mv={x:0,y:0,z:0},s=0.05
    if(keys.w)mv.z+=s;if(keys.s)mv.z-=s
    if(keys.a)mv.x-=s;if(keys.d)mv.x+=s
    if(keys[" "])mv.y+=s;if(keys.Shift)mv.y-=s
    mv=rotate_yz(mv,camera.pitch)
    mv=rotate_xz(mv,camera.yaw)
    camera.pos.x+=mv.x
    camera.pos.y+=mv.y
    camera.pos.z+=mv.z
    const polys=[]
    for(const f of figures){
        const verts=f.vs.map(p=>to_camera(translate(translate_z(p,2),f.center)))
        for(const face of f.faces){
            const pts=face.indices.map(i=>verts[i])
            if(pts.some(p=>p.z<=0)) continue
            const e1 = sub(pts[1], pts[0])
            const e2 = sub(pts[2], pts[0])

            let n = normalize(cross(e1, e2))

            const viewDir = normalize({ 
                x: -pts[0].x, 
                y: -pts[0].y, 
                z: -pts[0].z 
            })

            if(dot(n, viewDir) < 0){
                n = { x:-n.x, y:-n.y, z:-n.z }
            }
            let light=1
            const L = lightDir_camera()
            if(drawLighting) light = 0.2 + 0.8 * Math.max(0, dot(n, L))
            polys.push({
                proj:pts.map(p=>screen(project(p))),
                depth:(pts[0].z+pts[1].z+pts[2].z)/3,
                texture:f.texture,
                uvs:face.uvs,
                light
            })
        }
    }
    polys.sort((a,b)=>b.depth-a.depth)
    for(const p of polys) draw_polygon(p.proj,p.uvs,p.texture,p.light)
    drawLightPoint()
    requestAnimationFrame(frame)
}

add_cube({x:-0.7,y:0,z:0},0.5)
set_texture(figures.at(-1),"jes.jpg")

add_pyramid({x:0.7,y:0,z:0},0.4,0.5)
set_texture(figures.at(-1),"obama.jpg")

add_sphere({x:0,y:0,z:0},0.3,12,20)
set_texture(figures.at(-1),"saul.jpg")

frame()
