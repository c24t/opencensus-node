/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import {AggregationType, Measurement, MeasureUnit, Stats, Tags, View} from '../src';
import {LabelKey, LabelValue, MetricDescriptorType} from '../src/metrics/export/types';
import {MetricProducerForStats} from '../src/stats/metric-producer';

describe('Metric producer for stats', () => {
  const stats = new Stats();
  const metricProducerForStats = new MetricProducerForStats(stats);

  // constants for view name
  const viewName1 = 'test/view/name1';
  const viewName2 = 'test/view/name2';
  const viewName3 = 'test/view/name2';
  const description = 'test description';

  const measureDouble = stats.createMeasureDouble(
      'opencensus.io/test/double', MeasureUnit.UNIT, 'Measure Double');
  const tags: Tags = {testKey1: 'testValue1', testKey2: 'testValue2'};
  const labelKeys: LabelKey[] = [
    {'key': 'testKey1', 'description': ''},
    {'key': 'testKey2', 'description': ''}
  ];
  const labelValues: LabelValue[] =
      [{'value': 'testValue1'}, {'value': 'testValue2'}];
  const measurement1: Measurement = {measure: measureDouble, value: 25, tags};
  const measurement2: Measurement = {measure: measureDouble, value: 300, tags};

  // expected constants
  const expectedMetricDescriptor1 = {
    name: viewName1,
    description,
    labelKeys,
    unit: MeasureUnit.UNIT,
    type: MetricDescriptorType.CUMULATIVE_DOUBLE,
  };
  const expectedMetricDescriptor2 = {
    name: viewName2,
    description,
    labelKeys,
    unit: MeasureUnit.UNIT,
    type: MetricDescriptorType.CUMULATIVE_INT64,
  };
  const expectedMetricDescriptor3 = {
    name: viewName3,
    description,
    labelKeys,
    unit: MeasureUnit.UNIT,
    type: MetricDescriptorType.GAUGE_DOUBLE,
  };
  const expectedMetricDescriptor4 = {
    name: viewName3,
    description,
    labelKeys,
    unit: MeasureUnit.UNIT,
    type: MetricDescriptorType.CUMULATIVE_DISTRIBUTION,
  };

  it('should add sum stats', () => {
    const view: View = stats.createView(
        viewName1, measureDouble, AggregationType.SUM, Object.keys(tags),
        description);
    view.recordMeasurement(measurement1);

    const metrics = metricProducerForStats.getMetrics();

    assert.strictEqual(metrics.length, 1);
    const [{
      descriptor: actualMetricDescriptor1,
      timeseries: actualTimeSeries1
    }] = metrics;
    assert.deepStrictEqual(actualMetricDescriptor1, expectedMetricDescriptor1);
    assert.strictEqual(actualTimeSeries1.length, 1);
    assert.deepStrictEqual(actualTimeSeries1[0].labelValues, labelValues);
    assert.equal(actualTimeSeries1[0].points[0].value, 25);
  });

  it('should add count stats',
     () => {
       const view: View = stats.createView(
           viewName2, measureDouble, AggregationType.COUNT, Object.keys(tags),
           description);
       view.recordMeasurement(measurement1);

       let metrics = metricProducerForStats.getMetrics();

       assert.strictEqual(metrics.length, 2);
       const
        [{descriptor: actualMetricDescriptor1, timeseries: actualTimeSeries1},
         {descriptor: actualMetricDescriptor2, timeseries: actualTimeSeries2}] =
            metrics;
       assert.deepStrictEqual(
           actualMetricDescriptor1, expectedMetricDescriptor1);
       assert.strictEqual(actualTimeSeries1.length, 1);
       assert.deepStrictEqual(actualTimeSeries1[0].labelValues, labelValues);
       assert.equal(actualTimeSeries1[0].points[0].value, 25);
       assert.deepStrictEqual(
           actualMetricDescriptor2, expectedMetricDescriptor2);
       assert.strictEqual(actualTimeSeries2.length, 1);
       assert.deepStrictEqual(actualTimeSeries2[0].labelValues, labelValues);
       assert.equal(actualTimeSeries2[0].points[0].value, 1);

       // update count view
       view.recordMeasurement(measurement2);
       metrics = metricProducerForStats.getMetrics();
       assert.deepStrictEqual(metrics[1].timeseries[0].points[0].value, 2);
     });

  it('should add lastValue stats', () => {
    const view: View = stats.createView(
        viewName3, measureDouble, AggregationType.LAST_VALUE, Object.keys(tags),
        description);
    view.recordMeasurement(measurement1);
    view.recordMeasurement(measurement2);

    const metrics = metricProducerForStats.getMetrics();

    assert.strictEqual(metrics.length, 3);
    const
        [{descriptor: actualMetricDescriptor1, timeseries: actualTimeSeries1},
         {descriptor: actualMetricDescriptor2, timeseries: actualTimeSeries2},
         {descriptor: actualMetricDescriptor3, timeseries: actualTimeSeries3}] =
            metrics;
    assert.deepStrictEqual(actualMetricDescriptor1, expectedMetricDescriptor1);
    assert.strictEqual(actualTimeSeries1.length, 1);
    assert.strictEqual(actualTimeSeries1.length, 1);
    assert.deepStrictEqual(actualTimeSeries1[0].labelValues, labelValues);
    assert.equal(actualTimeSeries1[0].points[0].value, 25);
    assert.deepStrictEqual(actualMetricDescriptor2, expectedMetricDescriptor2);
    assert.strictEqual(actualTimeSeries2.length, 1);
    assert.deepStrictEqual(actualMetricDescriptor3, expectedMetricDescriptor3);
    assert.strictEqual(actualTimeSeries3.length, 1);
    assert.deepStrictEqual(actualTimeSeries3[0].labelValues, labelValues);
    assert.equal(actualTimeSeries3[0].points[0].value, 300);
  });

  it('should add distribution stats', () => {
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const buckets = [2, 4, 6];

    const view: View = stats.createView(
        viewName3, measureDouble, AggregationType.DISTRIBUTION,
        Object.keys(tags), description, buckets);
    for (const value of measurementValues) {
      const measurement: Measurement = {measure: measureDouble, value, tags};
      view.recordMeasurement(measurement);
    }

    const metrics = metricProducerForStats.getMetrics();

    assert.strictEqual(metrics.length, 4);
    const
        [{descriptor: actualMetricDescriptor1, timeseries: actualTimeSeries1},
         {descriptor: actualMetricDescriptor2, timeseries: actualTimeSeries2},
         {descriptor: actualMetricDescriptor3, timeseries: actualTimeSeries3},
         {descriptor: actualMetricDescriptor4, timeseries: actualTimeSeries4}] =
            metrics;
    assert.deepStrictEqual(actualMetricDescriptor1, expectedMetricDescriptor1);
    assert.strictEqual(actualTimeSeries1.length, 1);
    assert.deepStrictEqual(actualTimeSeries1[0].labelValues, labelValues);
    assert.equal(actualTimeSeries1[0].points[0].value, 25);
    assert.deepStrictEqual(actualMetricDescriptor2, expectedMetricDescriptor2);
    assert.strictEqual(actualTimeSeries2.length, 1);
    assert.deepStrictEqual(actualMetricDescriptor3, expectedMetricDescriptor3);
    assert.strictEqual(actualTimeSeries3.length, 1);
    assert.deepStrictEqual(actualTimeSeries3[0].labelValues, labelValues);
    assert.equal(actualTimeSeries3[0].points[0].value, 300);
    assert.deepStrictEqual(actualMetricDescriptor4, expectedMetricDescriptor4);
    assert.strictEqual(actualTimeSeries4.length, 1);
    assert.deepStrictEqual(actualTimeSeries4[0].labelValues, labelValues);
    assert.deepStrictEqual(actualTimeSeries4[0].points[0].value, {
      'bucketOptions': {'explicit': {'bounds': [2, 4, 6]}},
      'buckets': [{count: 1}, {count: 2}, {count: 2}, {count: 0}],
      'count': 5,
      'sum': 16.099999999999998,
      'sumOfSquaredDeviation': 10.427999999999997
    });
  });
});
