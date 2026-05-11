#!/usr/bin/env python3
"""
Pixel Dungeon Asset Generator
Generates all game sprites using Python Pillow.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'generated-assets')
os.makedirs(OUT, exist_ok=True)

def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path)
    print(f"  Generated: {name}")

def scale(img, factor, size=None):
    if size:
        return img.resize(size, Image.NEAREST)
    w, h = img.size
    return img.resize((w * factor, h * factor), Image.NEAREST)

def new(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

def draw(img):
    return ImageDraw.Draw(img)

# ── Player sprites (16×16 → 64×64) ─────────────────────────────────────────

def gen_player_knight():
    img = new(16, 16)
    d = draw(img)
    # legs
    d.rectangle([5, 12, 7, 15], fill=(60, 80, 140, 255))
    d.rectangle([9, 12, 11, 15], fill=(60, 80, 140, 255))
    # torso/armor
    d.rectangle([4, 7, 12, 12], fill=(100, 120, 180, 255))
    # shoulder pads
    d.rectangle([3, 7, 4, 9], fill=(140, 160, 220, 255))
    d.rectangle([12, 7, 13, 9], fill=(140, 160, 220, 255))
    # chest highlight
    d.rectangle([5, 8, 11, 10], fill=(130, 150, 210, 255))
    d.rectangle([7, 10, 9, 11], fill=(160, 180, 240, 255))
    # head
    d.rectangle([5, 3, 11, 7], fill=(100, 120, 180, 255))
    # visor
    d.rectangle([6, 5, 10, 6], fill=(60, 200, 220, 255))
    # sword
    d.rectangle([12, 5, 13, 12], fill=(200, 210, 220, 255))
    d.rectangle([12, 5, 14, 6], fill=(180, 150, 80, 255))
    # shield
    d.rectangle([2, 8, 4, 12], fill=(80, 100, 160, 255))
    d.rectangle([2, 8, 3, 10], fill=(120, 140, 200, 255))
    save(scale(img, 4), 'player_knight.png')

def gen_player_mage():
    img = new(16, 16)
    d = draw(img)
    # robe bottom
    d.rectangle([4, 9, 12, 15], fill=(90, 40, 130, 255))
    d.rectangle([3, 11, 13, 15], fill=(80, 30, 120, 255))
    # robe body
    d.rectangle([5, 6, 11, 10], fill=(110, 50, 160, 255))
    # arms
    d.rectangle([3, 7, 5, 11], fill=(90, 40, 130, 255))
    d.rectangle([11, 7, 13, 11], fill=(90, 40, 130, 255))
    # head
    d.ellipse([5, 3, 11, 8], fill=(220, 180, 140, 255))
    # wizard hat
    d.polygon([(8, 0), (5, 4), (11, 4)], fill=(80, 30, 120, 255))
    d.rectangle([4, 4, 12, 5], fill=(90, 40, 130, 255))
    # hat star
    d.rectangle([7, 2, 9, 3], fill=(255, 220, 80, 200))
    # staff
    d.rectangle([13, 3, 14, 14], fill=(140, 100, 60, 255))
    d.ellipse([12, 1, 16, 5], fill=(160, 80, 220, 255))
    d.ellipse([13, 2, 15, 4], fill=(220, 160, 255, 255))
    save(scale(img, 4), 'player_mage.png')

def gen_player_rogue():
    img = new(16, 16)
    d = draw(img)
    # legs
    d.rectangle([5, 11, 7, 15], fill=(40, 70, 40, 255))
    d.rectangle([9, 11, 11, 15], fill=(40, 70, 40, 255))
    # body
    d.rectangle([4, 6, 12, 12], fill=(50, 80, 50, 255))
    # belt
    d.rectangle([4, 10, 12, 11], fill=(100, 70, 30, 255))
    # arms
    d.rectangle([2, 7, 4, 11], fill=(40, 70, 40, 255))
    d.rectangle([12, 7, 14, 11], fill=(40, 70, 40, 255))
    # head/hood
    d.ellipse([5, 3, 11, 8], fill=(30, 30, 30, 255))
    d.rectangle([5, 3, 11, 6], fill=(50, 80, 50, 255))
    # eyes glow
    d.rectangle([6, 5, 7, 6], fill=(200, 60, 60, 255))
    d.rectangle([9, 5, 10, 6], fill=(200, 60, 60, 255))
    # daggers
    d.rectangle([1, 9, 3, 13], fill=(190, 200, 210, 255))
    d.rectangle([13, 9, 15, 13], fill=(190, 200, 210, 255))
    save(scale(img, 4), 'player_rogue.png')

# ── Enemy sprites (16×16 → 48×48) ───────────────────────────────────────────

def gen_enemy_slime():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([2, 5, 14, 14], fill=(60, 180, 60, 255))
    d.ellipse([3, 6, 13, 13], fill=(80, 210, 80, 255))
    d.ellipse([2, 5, 8, 10], fill=(100, 230, 100, 200))  # shine
    d.ellipse([4, 7, 6, 9], fill=(20, 20, 20, 255))   # eye l
    d.ellipse([10, 7, 12, 9], fill=(20, 20, 20, 255))  # eye r
    d.ellipse([4, 8, 5, 9], fill=(255, 255, 255, 200))
    d.ellipse([10, 8, 11, 9], fill=(255, 255, 255, 200))
    save(scale(img, 3), 'enemy_slime.png')

def gen_enemy_bat():
    img = new(16, 16)
    d = draw(img)
    # wings
    d.polygon([(0,8),(4,4),(6,8)], fill=(80, 40, 100, 255))
    d.polygon([(16,8),(12,4),(10,8)], fill=(80, 40, 100, 255))
    d.polygon([(0,8),(4,4),(5,10)], fill=(100, 60, 130, 255))
    d.polygon([(16,8),(12,4),(11,10)], fill=(100, 60, 130, 255))
    # body
    d.ellipse([5, 5, 11, 12], fill=(70, 35, 90, 255))
    # ears
    d.polygon([(6,5),(5,2),(7,4)], fill=(90, 50, 110, 255))
    d.polygon([(10,5),(11,2),(9,4)], fill=(90, 50, 110, 255))
    # eyes
    d.rectangle([6,7,7,8], fill=(200,40,40,255))
    d.rectangle([9,7,10,8], fill=(200,40,40,255))
    save(scale(img, 3), 'enemy_bat.png')

def gen_enemy_skeleton():
    img = new(16, 16)
    d = draw(img)
    # legs
    d.rectangle([5,11,7,15], fill=(220,220,200,255))
    d.rectangle([9,11,11,15], fill=(220,220,200,255))
    # ribcage
    d.rectangle([5,6,11,11], fill=(210,210,190,255))
    d.line([5,7,11,7], fill=(150,150,130,255), width=1)
    d.line([5,8,11,8], fill=(150,150,130,255), width=1)
    d.line([5,9,11,9], fill=(150,150,130,255), width=1)
    # arms
    d.rectangle([3,7,5,12], fill=(220,220,200,255))
    d.rectangle([11,7,13,12], fill=(220,220,200,255))
    # skull
    d.ellipse([5,2,11,8], fill=(230,230,210,255))
    d.rectangle([6,6,10,8], fill=(230,230,210,255))
    # eye sockets
    d.ellipse([5,4,7,6], fill=(20,20,20,255))
    d.ellipse([9,4,11,6], fill=(20,20,20,255))
    # teeth
    d.rectangle([6,7,7,8], fill=(200,200,180,255))
    d.rectangle([8,7,9,8], fill=(200,200,180,255))
    save(scale(img, 3), 'enemy_skeleton.png')

def gen_enemy_spider():
    img = new(16, 16)
    d = draw(img)
    # legs
    for lx, ly, lx2, ly2 in [(2,5,5,8),(1,7,4,9),(2,9,5,10),(14,5,11,8),(15,7,12,9),(14,9,11,10)]:
        d.line([lx,ly,lx2,ly2], fill=(80,50,30,255), width=1)
    # body
    d.ellipse([4,5,12,11], fill=(100,65,40,255))
    d.ellipse([5,9,11,14], fill=(80,50,30,255))
    # eyes
    for ex, ey in [(5,7),(7,6),(9,6),(11,7)]:
        d.rectangle([ex,ey,ex+1,ey+1], fill=(200,40,40,255))
    save(scale(img, 3), 'enemy_spider.png')

def gen_enemy_bomber():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([2,3,14,14], fill=(180,40,40,255))
    d.ellipse([3,4,13,13], fill=(210,60,60,255))
    d.ellipse([3,4,8,8], fill=(230,90,90,180))
    # fuse
    d.line([8,3,10,1], fill=(150,100,40,255), width=2)
    d.ellipse([9,0,12,3], fill=(255,200,50,255))
    # X eyes
    d.line([5,7,7,9], fill=(20,20,20,255), width=1)
    d.line([5,9,7,7], fill=(20,20,20,255), width=1)
    d.line([9,7,11,9], fill=(20,20,20,255), width=1)
    d.line([9,9,11,7], fill=(20,20,20,255), width=1)
    save(scale(img, 3), 'enemy_bomber.png')

def gen_enemy_healer():
    img = new(16, 16)
    d = draw(img)
    # robe
    d.rectangle([5,7,11,15], fill=(30,130,70,255))
    d.rectangle([4,9,12,15], fill=(20,110,60,255))
    # body
    d.rectangle([5,5,11,8], fill=(40,150,80,255))
    # head
    d.ellipse([5,2,11,7], fill=(180,220,150,255))
    # cross on chest
    d.rectangle([7,7,9,12], fill=(80,220,120,255))
    d.rectangle([5,9,11,10], fill=(80,220,120,255))
    # glow
    d.ellipse([4,1,12,8], fill=(100,255,150,60))
    save(scale(img, 3), 'enemy_healer.png')

def gen_enemy_summoner():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([4,8,12,15], fill=(50,20,80,255))
    d.rectangle([3,10,13,15], fill=(40,15,70,255))
    d.rectangle([4,5,12,9], fill=(60,25,90,255))
    d.rectangle([2,6,4,11], fill=(50,20,80,255))
    d.rectangle([12,6,14,11], fill=(50,20,80,255))
    d.ellipse([5,2,11,7], fill=(30,20,50,255))
    d.rectangle([5,2,11,5], fill=(60,25,90,255))
    d.ellipse([5,4,7,6], fill=(150,50,200,255))
    d.ellipse([9,4,11,6], fill=(150,50,200,255))
    # orb
    d.ellipse([11,3,15,7], fill=(180,80,240,255))
    d.ellipse([12,4,14,6], fill=(220,160,255,255))
    save(scale(img, 3), 'enemy_summoner.png')

def gen_enemy_minion():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([6,10,10,14], fill=(40,20,60,255))
    d.rectangle([5,7,11,11], fill=(50,25,75,255))
    d.ellipse([5,4,11,9], fill=(35,15,55,255))
    d.rectangle([5,4,8,7], fill=(50,25,75,255))
    d.ellipse([5,5,7,7], fill=(120,40,160,255))
    d.ellipse([9,5,11,7], fill=(120,40,160,255))
    save(scale(img, 3), 'enemy_minion.png')

def gen_enemy_elite_overlay():
    img = new(48, 48)
    d = draw(img)
    # golden glow ring
    for r in range(22, 26):
        d.ellipse([24-r, 24-r, 24+r, 24+r], outline=(255, 200, 50, 80), width=2)
    d.ellipse([2, 2, 46, 46], outline=(255, 180, 0, 120), width=3)
    save(img, 'enemy_elite_overlay.png')

# ── Boss sprite (32×32 → 128×128) ───────────────────────────────────────────

def gen_boss_necromancer():
    img = new(32, 32)
    d = draw(img)
    # robe
    d.polygon([(6,30),(26,30),(28,14),(4,14)], fill=(20,10,40,255))
    d.polygon([(6,30),(16,16),(26,30)], fill=(30,15,55,255))
    # cloak
    d.polygon([(4,14),(28,14),(24,8),(8,8)], fill=(15,8,35,255))
    # sleeves
    d.rectangle([2,13,8,22], fill=(20,10,40,255))
    d.rectangle([24,13,30,22], fill=(20,10,40,255))
    # hands
    d.ellipse([1,20,7,26], fill=(180,200,180,255))
    d.ellipse([25,20,31,26], fill=(180,200,180,255))
    # staff left hand
    d.rectangle([1,8,3,22], fill=(80,60,30,255))
    d.ellipse([0,5,6,11], fill=(140,40,200,255))
    d.ellipse([1,6,5,10], fill=(200,120,255,255))
    # skull head
    d.ellipse([10,2,22,14], fill=(200,210,190,255))
    d.rectangle([10,9,22,14], fill=(200,210,190,255))
    # eye sockets
    d.ellipse([11,5,14,9], fill=(20,20,20,255))
    d.ellipse([18,5,21,9], fill=(20,20,20,255))
    d.ellipse([11,6,13,8], fill=(180,40,40,200))
    d.ellipse([18,6,20,8], fill=(180,40,40,200))
    # hood
    d.polygon([(8,2),(16,0),(24,2),(22,8),(10,8)], fill=(15,8,35,255))
    d.polygon([(8,2),(16,0),(24,2)], fill=(25,12,50,255))
    # teeth
    d.rectangle([12,11,13,13], fill=(180,185,170,255))
    d.rectangle([14,11,15,14], fill=(180,185,170,255))
    d.rectangle([17,11,18,14], fill=(180,185,170,255))
    d.rectangle([19,11,20,13], fill=(180,185,170,255))
    # rune symbols on robe
    d.rectangle([13,18,15,22], fill=(100,40,160,180))
    d.rectangle([11,20,17,21], fill=(100,40,160,180))
    d.rectangle([19,18,21,22], fill=(100,40,160,180))
    d.rectangle([17,20,23,21], fill=(100,40,160,180))
    save(scale(img, 4), 'boss_necromancer.png')

# ── Tiles (16×16 → 64×64) ───────────────────────────────────────────────────

def gen_tile_floor_crypt():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(40,35,50,255))
    # stone blocks
    d.rectangle([0,0,7,7], fill=(45,40,55,255))
    d.rectangle([8,8,15,15], fill=(45,40,55,255))
    d.rectangle([0,8,7,15], fill=(42,37,52,255))
    d.rectangle([8,0,15,7], fill=(42,37,52,255))
    # mortar lines
    d.line([0,8,15,8], fill=(30,25,40,255))
    d.line([8,0,8,15], fill=(30,25,40,255))
    d.rectangle([3,3,5,5], fill=(50,45,60,220))  # detail
    save(scale(img, 4), 'tile_floor_crypt.png')

def gen_tile_wall_crypt():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(25,20,35,255))
    # brick pattern
    d.rectangle([0,0,7,3], fill=(35,28,45,255))
    d.rectangle([8,0,15,3], fill=(32,26,42,255))
    d.rectangle([0,4,3,7], fill=(32,26,42,255))
    d.rectangle([4,4,11,7], fill=(35,28,45,255))
    d.rectangle([12,4,15,7], fill=(32,26,42,255))
    d.rectangle([0,8,7,11], fill=(33,27,43,255))
    d.rectangle([8,8,15,11], fill=(35,28,45,255))
    d.rectangle([0,12,5,15], fill=(35,28,45,255))
    d.rectangle([6,12,15,15], fill=(32,26,42,255))
    # mortar
    for y in [4,8,12]:
        d.line([0,y,15,y], fill=(18,14,28,255))
    d.line([8,0,8,3], fill=(18,14,28,255))
    d.line([4,4,4,7], fill=(18,14,28,255))
    d.line([12,4,12,7], fill=(18,14,28,255))
    d.line([8,8,8,11], fill=(18,14,28,255))
    d.line([6,12,6,15], fill=(18,14,28,255))
    save(scale(img, 4), 'tile_wall_crypt.png')

def gen_tile_floor_forest():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(55,80,40,255))
    d.rectangle([2,2,5,5], fill=(65,95,48,255))
    d.rectangle([10,8,13,11], fill=(65,95,48,255))
    d.rectangle([6,12,9,14], fill=(70,100,52,255))
    d.rectangle([0,10,2,13], fill=(50,72,36,255))
    d.rectangle([13,2,15,5], fill=(60,88,44,255))
    d.ellipse([6,5,9,8], fill=(80,120,50,200))
    save(scale(img, 4), 'tile_floor_forest.png')

def gen_tile_wall_forest():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(60,40,20,255))
    d.rectangle([2,0,6,15], fill=(80,52,28,255))
    d.rectangle([10,0,14,15], fill=(80,52,28,255))
    d.ellipse([0,0,8,8], fill=(40,80,30,200))
    d.ellipse([8,0,16,8], fill=(50,90,35,200))
    d.rectangle([4,6,12,15], fill=(55,36,18,255))
    save(scale(img, 4), 'tile_wall_forest.png')

def gen_tile_floor_lava():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(50,25,15,255))
    # cracks
    d.line([3,0,6,5], fill=(200,80,20,255), width=1)
    d.line([6,5,4,9], fill=(200,80,20,255), width=1)
    d.line([10,2,13,7], fill=(180,60,10,255), width=1)
    d.line([0,11,5,14], fill=(200,80,20,255), width=1)
    d.line([9,9,15,13], fill=(180,60,10,255), width=1)
    # glow
    d.ellipse([4,3,8,7], fill=(255,120,30,100))
    d.ellipse([10,9,14,13], fill=(255,100,20,80))
    save(scale(img, 4), 'tile_floor_lava.png')

def gen_tile_wall_lava():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(30,12,8,255))
    d.rectangle([0,0,7,5], fill=(40,18,12,255))
    d.rectangle([8,0,15,5], fill=(36,15,10,255))
    d.rectangle([0,6,9,11], fill=(38,16,11,255))
    d.rectangle([10,6,15,11], fill=(40,18,12,255))
    d.rectangle([0,12,5,15], fill=(36,15,10,255))
    d.rectangle([6,12,15,15], fill=(40,18,12,255))
    d.rectangle([6,4,8,8], fill=(180,60,10,200))  # lava seep
    save(scale(img, 4), 'tile_wall_lava.png')

def gen_tile_door():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(100,70,30,255))
    d.rectangle([1,1,14,14], fill=(130,90,40,255))
    # planks
    d.line([1,5,14,5], fill=(90,60,25,255))
    d.line([1,10,14,10], fill=(90,60,25,255))
    # handle
    d.ellipse([11,6,13,9], fill=(180,150,50,255))
    d.rectangle([0,0,1,15], fill=(70,50,20,255))
    d.rectangle([14,0,15,15], fill=(70,50,20,255))
    d.rectangle([0,0,15,1], fill=(70,50,20,255))
    save(scale(img, 4), 'tile_door.png')

def gen_tile_spike():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,12,15,15], fill=(70,70,70,255))
    # spikes
    for x in [2,6,10]:
        d.polygon([(x,12),(x+4,12),(x+2,4)], fill=(160,160,170,255))
        d.polygon([(x+1,12),(x+3,12),(x+2,6)], fill=(200,200,210,255))
    save(scale(img, 4), 'tile_spike.png')

def gen_tile_poison_puddle():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([1,3,15,13], fill=(100,40,130,180))
    d.ellipse([2,4,14,12], fill=(130,60,160,160))
    d.ellipse([4,5,12,11], fill=(160,80,190,140))
    d.ellipse([6,7,10,9], fill=(200,120,220,120))
    save(scale(img, 4), 'tile_poison_puddle.png')

def gen_tile_lava_crack():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([0,0,15,15], fill=(0,0,0,0))
    d.line([2,0,6,5,4,10,8,16], fill=(255,120,20,220), width=2)
    d.line([2,0,6,5,4,10,8,16], fill=(255,200,50,120), width=4)
    save(scale(img, 4), 'tile_lava_crack.png')

# ── UI icons (24×24) ─────────────────────────────────────────────────────────

def gen_icon_fireball():
    img = new(24, 24)
    d = draw(img)
    d.ellipse([6,4,18,16], fill=(255,120,20,255))
    d.ellipse([8,6,16,14], fill=(255,200,50,255))
    d.ellipse([9,8,15,13], fill=(255,240,180,255))
    d.polygon([(12,2),(10,7),(14,7)], fill=(255,160,30,255))
    d.polygon([(6,6),(3,12),(8,10)], fill=(255,80,20,220))
    d.polygon([(18,6),(21,12),(16,10)], fill=(255,80,20,220))
    save(img, 'icon_fireball.png')

def gen_icon_dash():
    img = new(24, 24)
    d = draw(img)
    for i, alpha in [(0,80),(1,130),(2,200),(3,255)]:
        x = 3 + i*4
        d.rectangle([x,9,x+3,15], fill=(80,160,255,alpha))
    d.polygon([(18,5),(24,12),(18,19)], fill=(140,210,255,255))
    d.polygon([(18,5),(23,12),(18,19)], fill=(200,235,255,255))
    save(img, 'icon_dash.png')

def gen_icon_nova():
    img = new(24, 24)
    d = draw(img)
    d.ellipse([8,8,16,16], fill=(120,200,255,255))
    d.ellipse([9,9,15,15], fill=(200,240,255,255))
    for angle_deg in range(0,360,45):
        import math
        a = math.radians(angle_deg)
        x1 = int(12 + 5*math.cos(a)); y1 = int(12 + 5*math.sin(a))
        x2 = int(12 + 10*math.cos(a)); y2 = int(12 + 10*math.sin(a))
        d.line([x1,y1,x2,y2], fill=(180,230,255,255), width=2)
    save(img, 'icon_nova.png')

def gen_icon_coin():
    img = new(24, 24)
    d = draw(img)
    d.ellipse([3,3,21,21], fill=(200,160,20,255))
    d.ellipse([4,4,20,20], fill=(230,190,40,255))
    d.ellipse([6,6,18,18], fill=(245,210,60,255))
    d.text = None
    d.ellipse([9,9,15,15], fill=(255,220,80,255))
    d.line([10,8,10,16], fill=(200,160,20,255), width=2)
    d.line([8,10,14,10], fill=(200,160,20,255), width=1)
    d.line([8,14,14,14], fill=(200,160,20,255), width=1)
    save(img, 'icon_coin.png')

def gen_icon_crystal():
    img = new(24, 24)
    d = draw(img)
    d.polygon([(12,2),(18,8),(16,20),(8,20),(6,8)], fill=(140,60,200,255))
    d.polygon([(12,2),(18,8),(16,20),(8,20),(6,8)], outline=(180,100,240,255), width=1)
    d.polygon([(12,2),(14,7),(10,7)], fill=(200,140,255,255))
    d.line([10,7,8,20], fill=(170,90,230,255), width=1)
    d.line([14,7,16,20], fill=(170,90,230,255), width=1)
    save(img, 'icon_crystal.png')

def gen_icon_heart():
    img = new(24, 24)
    d = draw(img)
    d.ellipse([3,5,13,14], fill=(220,40,60,255))
    d.ellipse([11,5,21,14], fill=(220,40,60,255))
    d.polygon([(3,12),(12,22),(21,12),(12,8)], fill=(220,40,60,255))
    d.ellipse([5,7,11,12], fill=(240,80,90,200))
    save(img, 'icon_heart.png')

def gen_icon_xp():
    img = new(24, 24)
    d = draw(img)
    import math
    pts = []
    for i in range(5):
        a = math.radians(i*72 - 90)
        pts.append((int(12+9*math.cos(a)), int(12+9*math.sin(a))))
        a2 = math.radians(i*72 - 90 + 36)
        pts.append((int(12+4*math.cos(a2)), int(12+4*math.sin(a2))))
    d.polygon(pts, fill=(80,200,80,255))
    d.polygon(pts, outline=(120,240,120,255), width=1)
    save(img, 'icon_xp.png')

# ── Ability effects (16×16 → 48×48) ─────────────────────────────────────────

def gen_effect_fireball():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([2,4,14,12], fill=(255,100,20,255))
    d.ellipse([4,5,12,11], fill=(255,180,50,255))
    d.ellipse([6,6,10,10], fill=(255,240,180,255))
    d.polygon([(14,8),(10,5),(10,11)], fill=(255,60,10,255))
    save(scale(img, 3), 'effect_fireball.png')

def gen_effect_explosion():
    img = new(16, 16)
    d = draw(img)
    import math
    for r in [7,6,5]:
        for a in range(0,360,30):
            x = int(8 + r*math.cos(math.radians(a)))
            y = int(8 + r*math.sin(math.radians(a)))
            d.ellipse([x-2,y-2,x+2,y+2], fill=(255,max(0,200-(7-r)*40),20,200))
    d.ellipse([4,4,12,12], fill=(255,200,50,200))
    d.ellipse([5,5,11,11], fill=(255,240,180,220))
    save(scale(img, 3), 'effect_explosion.png')

def gen_effect_freeze():
    img = new(16, 16)
    d = draw(img)
    d.line([8,1,8,15], fill=(160,220,255,255), width=2)
    d.line([1,8,15,8], fill=(160,220,255,255), width=2)
    d.line([3,3,13,13], fill=(160,220,255,255), width=1)
    d.line([13,3,3,13], fill=(160,220,255,255), width=1)
    d.ellipse([6,6,10,10], fill=(200,240,255,255))
    save(scale(img, 3), 'effect_freeze.png')

def gen_effect_poison():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([3,5,13,12], fill=(130,60,160,200))
    d.ellipse([4,6,12,11], fill=(160,80,190,180))
    d.ellipse([2,3,6,7], fill=(150,70,180,200))
    d.ellipse([10,3,14,7], fill=(140,65,175,200))
    d.ellipse([6,8,10,13], fill=(155,75,185,190))
    save(scale(img, 3), 'effect_poison.png')

def gen_effect_burn():
    img = new(16, 16)
    d = draw(img)
    d.polygon([(8,1),(5,6),(7,6),(4,11),(6,10),(3,15),(13,15),(10,10),(12,11),(9,6),(11,6)], fill=(255,100,20,230))
    d.polygon([(8,3),(6,7),(8,7),(6,11),(8,10),(7,14),(11,14),(9,10),(11,11),(10,7),(11,7)], fill=(255,200,50,220))
    save(scale(img, 3), 'effect_burn.png')

def gen_effect_shock():
    img = new(16, 16)
    d = draw(img)
    pts = [(8,0),(10,6),(14,6),(10,9),(12,16),(8,11),(4,16),(6,9),(2,6),(6,6)]
    d.polygon(pts, fill=(255,240,50,240))
    d.polygon(pts, outline=(255,255,150,200), width=1)
    save(scale(img, 3), 'effect_shock.png')

def gen_effect_dash_trail():
    img = new(16, 16)
    d = draw(img)
    for i, alpha in [(0,60),(1,100),(2,150),(3,200)]:
        x = 2 + i*3
        d.rectangle([x, 4, x+2, 12], fill=(100,180,255,alpha))
    save(scale(img, 3), 'effect_dash_trail.png')

# ── Loot / objects (16×16 → 48×48) ──────────────────────────────────────────

def gen_chest():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([1,7,15,14], fill=(120,80,30,255))
    d.rectangle([2,8,14,13], fill=(150,100,40,255))
    d.rectangle([1,5,15,8], fill=(100,65,25,255))
    d.rectangle([2,6,14,8], fill=(130,85,35,255))
    d.rectangle([1,5,15,6], fill=(80,55,20,255))
    d.rectangle([7,9,9,13], fill=(180,150,50,255))
    d.rectangle([7,10,9,12], fill=(200,170,60,255))
    # studs
    for x in [2,13]:
        d.rectangle([x,6,x+1,7], fill=(160,130,50,255))
    for x in [2,13]:
        d.rectangle([x,9,x+1,10], fill=(160,130,50,255))
    d.line([1,8,15,8], fill=(80,55,20,255))
    save(scale(img, 3), 'chest.png')

def gen_chest_open():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([1,9,15,14], fill=(120,80,30,255))
    d.rectangle([2,10,14,13], fill=(150,100,40,255))
    # open lid
    d.rectangle([1,4,15,8], fill=(100,65,25,255))
    d.rectangle([2,5,14,7], fill=(130,85,35,255))
    d.rectangle([1,4,15,5], fill=(80,55,20,255))
    d.rectangle([7,9,9,14], fill=(180,150,50,255))
    # coins spilling
    d.ellipse([4,7,7,10], fill=(220,180,40,255))
    d.ellipse([9,6,12,9], fill=(220,180,40,255))
    d.ellipse([6,5,9,8], fill=(230,190,50,255))
    save(scale(img, 3), 'chest_open.png')

def gen_portal():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([1,1,15,15], fill=(80,20,120,255))
    d.ellipse([2,2,14,14], fill=(120,40,180,255))
    d.ellipse([4,4,12,12], fill=(160,80,220,255))
    d.ellipse([6,6,10,10], fill=(200,140,255,255))
    d.ellipse([7,7,9,9], fill=(240,210,255,255))
    # swirl effect
    import math
    for i in range(8):
        a = math.radians(i*45)
        r1, r2 = 3+i*0.3, 4+i*0.3
        x1 = int(8+r1*math.cos(a)); y1 = int(8+r1*math.sin(a))
        d.ellipse([x1-1,y1-1,x1+1,y1+1], fill=(220,160,255,180))
    save(scale(img, 3), 'portal.png')

def gen_coin_pickup():
    img = new(16, 16)
    d = draw(img)
    d.ellipse([4,4,12,12], fill=(200,160,20,255))
    d.ellipse([5,5,11,11], fill=(230,190,40,255))
    d.ellipse([6,6,10,10], fill=(245,210,60,255))
    save(scale(img, 3), 'coin_pickup.png')

def gen_crystal_pickup():
    img = new(16, 16)
    d = draw(img)
    d.polygon([(8,2),(12,6),(11,13),(5,13),(4,6)], fill=(140,60,200,255))
    d.polygon([(8,2),(10,5),(6,5)], fill=(200,140,255,255))
    d.line([6,5,5,13], fill=(170,90,230,255), width=1)
    d.line([10,5,11,13], fill=(170,90,230,255), width=1)
    save(scale(img, 3), 'crystal_pickup.png')

def gen_shopkeeper():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([5,9,11,15], fill=(160,120,60,255))
    d.rectangle([4,11,12,15], fill=(140,100,50,255))
    d.rectangle([4,7,12,10], fill=(180,140,70,255))
    d.rectangle([2,8,4,12], fill=(160,120,60,255))
    d.rectangle([12,8,14,12], fill=(160,120,60,255))
    d.ellipse([5,3,11,8], fill=(230,190,140,255))
    d.rectangle([4,3,12,6], fill=(100,70,30,255))
    d.ellipse([4,2,12,5], fill=(120,80,35,255))
    d.rectangle([5,5,7,6], fill=(60,40,20,200))
    d.rectangle([9,5,11,6], fill=(60,40,20,200))
    d.rectangle([6,7,10,8], fill=(200,150,80,200))
    # apron
    d.rectangle([6,9,10,13], fill=(240,230,200,255))
    # coin bag
    d.ellipse([10,10,14,14], fill=(180,150,40,255))
    d.ellipse([11,11,13,13], fill=(220,190,60,255))
    save(scale(img, 3), 'shopkeeper.png')

# ── Upgrade card icons (20×20) ───────────────────────────────────────────────

UPGRADE_ICONS = {
    'upgrade_damage': [(255,80,80), lambda d: [
        d.polygon([(10,2),(7,8),(13,8)], fill=(255,80,80,255)),
        d.polygon([(10,2),(8,7),(12,7)], fill=(255,150,150,255)),
        d.rectangle([8,8,12,18], fill=(255,80,80,255)),
    ]],
    'upgrade_speed': [(100,200,255), lambda d: [
        d.polygon([(2,10),(10,4),(10,8),(18,8),(18,12),(10,12),(10,16)], fill=(100,200,255,255)),
        d.polygon([(2,10),(10,5),(10,9),(17,9),(17,11),(10,11),(10,15)], fill=(180,230,255,255)),
    ]],
    'upgrade_fireball': [(255,140,20), lambda d: [
        d.ellipse([5,5,15,15], fill=(255,140,20,255)),
        d.ellipse([7,7,13,13], fill=(255,200,50,255)),
        d.ellipse([9,9,11,11], fill=(255,240,180,255)),
    ]],
    'upgrade_attackspeed': [(255,200,50), lambda d: [
        d.line([10,2,10,18], fill=(255,200,50,255), width=3),
        d.line([2,10,18,10], fill=(255,200,50,255), width=3),
        d.ellipse([7,7,13,13], fill=(255,200,50,255)),
        d.ellipse([8,8,12,12], fill=(255,240,180,255)),
    ]],
    'upgrade_maxhp': [(220,40,60), lambda d: [
        d.ellipse([2,4,11,12], fill=(220,40,60,255)),
        d.ellipse([9,4,18,12], fill=(220,40,60,255)),
        d.polygon([(2,10),(10,19),(18,10),(10,6)], fill=(220,40,60,255)),
        d.ellipse([5,6,9,10], fill=(240,80,90,180)),
    ]],
    'upgrade_range': [(80,200,200), lambda d: [
        d.ellipse([2,2,18,18], outline=(80,200,200,255), width=2),
        d.ellipse([6,6,14,14], outline=(80,200,200,255), width=2),
        d.ellipse([9,9,11,11], fill=(80,200,200,255)),
    ]],
    'upgrade_nova': [(160,220,255), lambda d: [
        d.ellipse([7,7,13,13], fill=(160,220,255,255)),
        d.line([10,2,10,6], fill=(160,220,255,255), width=2),
        d.line([10,14,10,18], fill=(160,220,255,255), width=2),
        d.line([2,10,6,10], fill=(160,220,255,255), width=2),
        d.line([14,10,18,10], fill=(160,220,255,255), width=2),
        d.line([4,4,7,7], fill=(160,220,255,255), width=2),
        d.line([13,13,16,16], fill=(160,220,255,255), width=2),
        d.line([16,4,13,7], fill=(160,220,255,255), width=2),
        d.line([4,16,7,13], fill=(160,220,255,255), width=2),
    ]],
    'upgrade_dash': [(100,180,255), lambda d: [
        d.polygon([(14,5),(20,10),(14,15),(14,11),(4,11),(4,9),(14,9)], fill=(100,180,255,255)),
        d.polygon([(14,6),(19,10),(14,14),(14,12),(5,12),(5,10),(14,10)], fill=(180,220,255,180)),
    ]],
    'upgrade_lifesteal': [(220,60,100), lambda d: [
        d.ellipse([4,3,10,8], fill=(220,60,100,255)),
        d.ellipse([10,3,16,8], fill=(220,60,100,255)),
        d.polygon([(4,7),(10,15),(16,7),(10,5)], fill=(220,60,100,255)),
        d.rectangle([8,10,12,16], fill=(80,200,80,255)),
        d.rectangle([6,12,14,14], fill=(80,200,80,255)),
    ]],
    'upgrade_multishot': [(255,160,60), lambda d: [
        d.polygon([(2,10),(12,8),(18,10),(12,12)], fill=(255,160,60,255)),
        d.polygon([(2,5),(12,4),(16,5),(12,6)], fill=(255,160,60,180)),
        d.polygon([(2,15),(12,14),(16,15),(12,16)], fill=(255,160,60,180)),
    ]],
    'upgrade_thorns': [(120,80,200), lambda d: [
        d.polygon([(10,1),(12,6),(17,5),(14,9),(19,11),(14,12),(16,17),(10,14),(4,17),(6,12),(1,11),(6,9),(3,5),(8,6)], fill=(120,80,200,255)),
    ]],
    'upgrade_critical': [(255,60,60), lambda d: [
        d.polygon([(10,1),(11,8),(18,8),(12,13),(14,19),(10,15),(6,19),(8,13),(2,8),(9,8)], fill=(255,60,60,255)),
    ]],
}

def gen_upgrade_icons():
    for name, (color, draw_fn) in UPGRADE_ICONS.items():
        img = new(20, 20)
        d = draw(img)
        draw_fn(d)
        save(img, f'{name}.png')

# ── XP gem ────────────────────────────────────────────────────────────────────

def gen_xp_gem():
    img = new(10, 10)
    d = draw(img)
    d.ellipse([1,1,9,9], fill=(60,200,80,255))
    d.ellipse([2,2,6,6], fill=(120,240,140,200))
    save(scale(img, 2), 'xp_gem.png')

# ── Particle effects ─────────────────────────────────────────────────────────

def gen_particle_spark():
    img = new(8, 8)
    d = draw(img)
    d.ellipse([2,2,6,6], fill=(255,220,80,255))
    d.ellipse([3,3,5,5], fill=(255,255,200,255))
    save(img, 'particle_spark.png')

def gen_heal_effect():
    img = new(16, 16)
    d = draw(img)
    d.rectangle([7,2,9,14], fill=(80,220,120,255))
    d.rectangle([2,6,14,10], fill=(80,220,120,255))
    d.rectangle([7,3,9,13], fill=(160,255,180,200))
    d.rectangle([3,7,13,9], fill=(160,255,180,200))
    save(scale(img, 3), 'heal_effect.png')

def gen_ui_frame():
    img = new(64, 64)
    d = draw(img)
    d.rectangle([0,0,63,63], fill=(30,25,40,220))
    d.rectangle([0,0,63,2], fill=(80,60,120,255))
    d.rectangle([0,61,63,63], fill=(80,60,120,255))
    d.rectangle([0,0,2,63], fill=(80,60,120,255))
    d.rectangle([61,0,63,63], fill=(80,60,120,255))
    d.rectangle([2,2,4,4], fill=(120,100,160,255))
    d.rectangle([59,2,61,4], fill=(120,100,160,255))
    d.rectangle([2,59,4,61], fill=(120,100,160,255))
    d.rectangle([59,59,61,61], fill=(120,100,160,255))
    save(img, 'ui_frame.png')

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("Generating pixel art assets...")
    print("\n[Player sprites]")
    gen_player_knight()
    gen_player_mage()
    gen_player_rogue()

    print("\n[Enemy sprites]")
    gen_enemy_slime()
    gen_enemy_bat()
    gen_enemy_skeleton()
    gen_enemy_spider()
    gen_enemy_bomber()
    gen_enemy_healer()
    gen_enemy_summoner()
    gen_enemy_minion()
    gen_enemy_elite_overlay()

    print("\n[Boss sprites]")
    gen_boss_necromancer()

    print("\n[Tile sprites]")
    gen_tile_floor_crypt()
    gen_tile_wall_crypt()
    gen_tile_floor_forest()
    gen_tile_wall_forest()
    gen_tile_floor_lava()
    gen_tile_wall_lava()
    gen_tile_door()
    gen_tile_spike()
    gen_tile_poison_puddle()
    gen_tile_lava_crack()

    print("\n[UI icons]")
    gen_icon_fireball()
    gen_icon_dash()
    gen_icon_nova()
    gen_icon_coin()
    gen_icon_crystal()
    gen_icon_heart()
    gen_icon_xp()

    print("\n[Ability effects]")
    gen_effect_fireball()
    gen_effect_explosion()
    gen_effect_freeze()
    gen_effect_poison()
    gen_effect_burn()
    gen_effect_shock()
    gen_effect_dash_trail()

    print("\n[Loot / objects]")
    gen_chest()
    gen_chest_open()
    gen_portal()
    gen_coin_pickup()
    gen_crystal_pickup()
    gen_shopkeeper()

    print("\n[Upgrade icons]")
    gen_upgrade_icons()

    print("\n[Misc]")
    gen_xp_gem()
    gen_particle_spark()
    gen_heal_effect()
    gen_ui_frame()

    count = len(os.listdir(OUT))
    print(f"\nDone! {count} assets saved to: {os.path.abspath(OUT)}")
