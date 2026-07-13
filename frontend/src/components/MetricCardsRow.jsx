import { Col, Row, Spin } from 'antd'

const cardClass = {
  amber: 'app-metric-card app-metric-card--amber',
  emerald: 'app-metric-card app-metric-card--emerald',
  sky: 'app-metric-card app-metric-card--sky',
  violet: 'app-metric-card app-metric-card--violet'
}

function MetricCardsRow({ items, loading }) {
  return (
    <Spin spinning={!!loading}>
      <Row gutter={[16, 16]} className="app-metric-row">
        {items.map((item, index) => (
          <Col xs={24} sm={12} lg={8} key={item.key ?? index}>
            <div className={cardClass[item.variant] || cardClass.sky}>
              <div className="app-metric-label">{item.label}</div>
              <div className="app-metric-value">{item.value}</div>
              {item.hint ? (
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>{item.hint}</div>
              ) : null}
            </div>
          </Col>
        ))}
      </Row>
    </Spin>
  )
}

export default MetricCardsRow
