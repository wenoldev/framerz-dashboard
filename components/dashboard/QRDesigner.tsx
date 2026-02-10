"use client"

import { useEffect, useRef, useState } from "react"
import QRCodeStyling, {
    Options,
    DrawType,
    DotType,
    CornerSquareType,
    CornerDotType,
} from "qr-code-styling"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, X } from "lucide-react"

type QRDesignerProps = {
    url: string
    isOpen: boolean
    onClose: () => void
    title: string
}

export default function QRDesigner({ url, isOpen, onClose, title }: QRDesignerProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null)

    // Customization state
    const [dotsColor, setDotsColor] = useState("#000000")
    const [bgColor, setBgColor] = useState("#ffffff")
    const [dotType, setDotType] = useState<DotType>("rounded")
    const [cornerType, setCornerType] = useState<CornerSquareType>("square")
    const [size, setSize] = useState(300)

    useEffect(() => {
        if (!isOpen) return

        // Initialize QR Code Styling
        const qr = new QRCodeStyling({
            width: size,
            height: size,
            type: "svg" as DrawType,
            data: url,
            image: "",
            margin: 0,
            dotsOptions: {
                color: dotsColor,
                type: dotType,
            },
            backgroundOptions: {
                color: bgColor,
            },
            cornersSquareOptions: {
                type: cornerType,
                color: dotsColor,
            },
            cornersDotOptions: {
                type: "dot" as CornerDotType,
                color: dotsColor,
            },
            imageOptions: {
                crossOrigin: "anonymous",
                margin: 10,
            },
        })

        setQrCode(qr)

        // Wait for dialog animation
        const timer = setTimeout(() => {
            if (ref.current) {
                ref.current.innerHTML = ""
                qr.append(ref.current)
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [isOpen, url]) // Re-create on open

    // Update on change
    useEffect(() => {
        if (!qrCode) return
        qrCode.update({
            width: size,
            height: size,
            data: url,
            margin: 10,
            dotsOptions: {
                color: dotsColor,
                type: dotType,
            },
            backgroundOptions: {
                color: bgColor,
            },
            cornersSquareOptions: {
                type: cornerType,
                color: dotsColor,
            },
            cornersDotOptions: {
                color: dotsColor
            }
        })
    }, [qrCode, dotsColor, bgColor, dotType, cornerType, size, url])

    const handleDownload = () => {
        if (qrCode) {
            qrCode.download({
                name: `qr-${title || "code"}`,
                extension: "png",
            })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Design QR Code</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    {/* Preview Area */}
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div ref={ref} className="bg-white shadow-sm p-0 rounded-xl overflow-hidden" />
                        <p className="mt-4 text-sm text-gray-500 font-medium">{title}</p>
                        <p className="text-xs text-gray-400 break-all text-center max-w-[250px] mt-1">{url}</p>
                    </div>

                    {/* Controls Area */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">Customization</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dots Style</Label>
                                    <Select value={dotType} onValueChange={(v) => setDotType(v as DotType)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="square">Square</SelectItem>
                                            <SelectItem value="dots">Dots</SelectItem>
                                            <SelectItem value="rounded">Rounded</SelectItem>
                                            <SelectItem value="classy">Classy</SelectItem>
                                            <SelectItem value="classy-rounded">Classy Rounded</SelectItem>
                                            <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Corner Style</Label>
                                    <Select value={cornerType} onValueChange={(v) => setCornerType(v as CornerSquareType)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="square">Square</SelectItem>
                                            <SelectItem value="dot">Dot</SelectItem>
                                            <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>QR Color</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="color"
                                            value={dotsColor}
                                            onChange={(e) => setDotsColor(e.target.value)}
                                            className="w-12 h-12 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={dotsColor}
                                            onChange={(e) => setDotsColor(e.target.value)}
                                            className="flex-1 font-mono uppercase"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Background</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="color"
                                            value={bgColor}
                                            onChange={(e) => setBgColor(e.target.value)}
                                            className="w-12 h-12 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={bgColor}
                                            onChange={(e) => setBgColor(e.target.value)}
                                            className="flex-1 font-mono uppercase"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex flex-col gap-3">
                            <Button onClick={handleDownload} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                <Download className="mr-2 h-4 w-4" />
                                Download PNG
                            </Button>
                            <Button variant="outline" onClick={onClose} className="w-full">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
