import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Vector-drawn application icon. No external image generation or runtime asset download.
let destination = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
let colorSpace = CGColorSpaceCreateDeviceRGB()
let names: [(String, Int)] = [("icon_16x16",16),("icon_16x16@2x",32),("icon_32x32",32),("icon_32x32@2x",64),("icon_128x128",128),("icon_128x128@2x",256),("icon_256x256",256),("icon_256x256@2x",512),("icon_512x512",512),("icon_512x512@2x",1024)]
for (name, size) in names {
    let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.scaleBy(x: CGFloat(size) / 1024, y: CGFloat(size) / 1024)
    let rect = CGRect(x: 42, y: 42, width: 940, height: 940)
    context.addPath(CGPath(roundedRect: rect, cornerWidth: 208, cornerHeight: 208, transform: nil))
    context.setFillColor(CGColor(red: 0.055, green: 0.043, blue: 0.06, alpha: 1)); context.fillPath()
    context.addPath(CGPath(roundedRect: rect.insetBy(dx: 1, dy: 1), cornerWidth: 208, cornerHeight: 208, transform: nil))
    context.setStrokeColor(CGColor(red: 0.25, green: 0.1, blue: 0.15, alpha: 1)); context.setLineWidth(3); context.strokePath()
    context.translateBy(x: 182, y: 202); context.scaleBy(x: 3.3, y: 3.3)
    let red = CGColor(red: 1, green: 0.14, blue: 0.22, alpha: 1)
    context.setStrokeColor(red); context.setFillColor(red); context.setLineWidth(13)
    context.setShadow(offset: .zero, blur: 10, color: CGColor(red: 1, green: 0.05, blue: 0.12, alpha: 0.35))
    context.strokeEllipse(in: CGRect(x: 12, y: 12, width: 176, height: 176))
    context.setLineWidth(12); context.setLineJoin(.round)
    context.move(to: CGPoint(x: 100,y: 26)); context.addLine(to: CGPoint(x: 100,y: 120))
    context.move(to: CGPoint(x: 100,y: 68)); context.addLine(to: CGPoint(x: 59,y: 105))
    context.move(to: CGPoint(x: 100,y: 68)); context.addLine(to: CGPoint(x: 141,y: 105)); context.strokePath()
    for (x,y,r) in [(100.0,135.0,24.0),(54.0,104.0,23.0),(146.0,104.0,23.0)] { context.fillEllipse(in: CGRect(x:x-r,y:y-r,width:r*2,height:r*2)) }
    let image = context.makeImage()!
    let output = CGImageDestinationCreateWithURL(destination.appendingPathComponent(name + ".png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(output, image, nil)
    guard CGImageDestinationFinalize(output) else { fatalError("Could not save icon") }
}
