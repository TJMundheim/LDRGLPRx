import Foundation

/// Intercepts every request in a test session. Nothing reaches the real network.
final class StubURLProtocol: URLProtocol {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (Int, Data))?
    nonisolated(unsafe) static var requests: [URLRequest] = []
    nonisolated(unsafe) static var bodies: [Data] = []

    static func reset() { handler = nil; requests = []; bodies = [] }

    static func session() -> URLSession {
        let c = URLSessionConfiguration.ephemeral
        c.protocolClasses = [StubURLProtocol.self]
        return URLSession(configuration: c)
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        var body = request.httpBody ?? Data()
        if body.isEmpty, let s = request.httpBodyStream {
            s.open(); defer { s.close() }
            var buf = [UInt8](repeating: 0, count: 4096)
            while s.hasBytesAvailable {
                let n = s.read(&buf, maxLength: buf.count)
                if n <= 0 { break }
                body.append(buf, count: n)
            }
        }
        Self.requests.append(request)
        Self.bodies.append(body)
        do {
            guard let h = Self.handler else { throw URLError(.notConnectedToInternet) }
            let (code, data) = try h(request)
            let resp = HTTPURLResponse(url: request.url!, statusCode: code, httpVersion: nil, headerFields: nil)!
            client?.urlProtocol(self, didReceive: resp, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }
    override func stopLoading() {}
}
