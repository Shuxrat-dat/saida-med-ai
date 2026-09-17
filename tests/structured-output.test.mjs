import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Zod schemas corresponding to our system models
const KeyFactSchema = z.object({
  fact: z.string(),
  sourcePage: z.number(),
  isHighYield: z.boolean(),
});

const ConceptSchema = z.object({
  name: z.string(),
  definition: z.string(),
  clinicalSignificance: z.string().optional(),
  facts: z.array(KeyFactSchema),
});

const TopicSchema = z.object({
  name: z.string(),
  description: z.string(),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]),
  examRelevance: z.enum(["HIGH", "MEDIUM", "LOW"]),
  concepts: z.array(ConceptSchema),
});

const DocumentAnalysisSchema = z.object({
  subject: z.string(),
  summary: z.string(),
  topics: z.array(TopicSchema),
  relationships: z.array(
    z.object({
      sourceConceptName: z.string(),
      targetConceptName: z.string(),
      relationshipType: z.string(),
      description: z.string(),
    })
  ),
});

test("DocumentAnalysisSchema validates valid structured medical extraction", () => {
  const sample = {
    subject: "Cardiology",
    summary: "Cardiac hemodynamics and electrical conduction principles.",
    topics: [
      {
        name: "Cardiac Conduction",
        description: "Pacemaker hierarchy and nodal delays.",
        importance: "HIGH",
        examRelevance: "HIGH",
        concepts: [
          {
            name: "SA Node",
            definition: "Primary cardiac pacemaker firing at 60-100 bpm.",
            clinicalSignificance: "Sick sinus syndrome manifests as bradycardia-tachycardia.",
            facts: [
              {
                fact: "Intrinsic rate is governed by funny sodium channels (If).",
                sourcePage: 12,
                isHighYield: true,
              },
            ],
          },
        ],
      },
    ],
    relationships: [
      {
        sourceConceptName: "SA Node",
        targetConceptName: "AV Node",
        relationshipType: "propagates_to",
        description: "Action potential travels through internodal tracts to AV node.",
      },
    ],
  };

  const validated = DocumentAnalysisSchema.parse(sample);
  assert.equal(validated.subject, "Cardiology");
  assert.equal(validated.topics.length, 1);
  assert.equal(validated.topics[0].concepts[0].facts[0].sourcePage, 12);
});

test("DocumentAnalysisSchema rejects invalid importance enum", () => {
  const invalid = {
    subject: "Cardiology",
    summary: "Summary text",
    topics: [
      {
        name: "Topic",
        description: "Desc",
        importance: "EXTREME", // invalid
        examRelevance: "HIGH",
        concepts: [],
      },
    ],
    relationships: [],
  };

  assert.throws(() => {
    DocumentAnalysisSchema.parse(invalid);
  });
});
