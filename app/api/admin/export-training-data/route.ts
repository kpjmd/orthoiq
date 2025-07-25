import { NextRequest, NextResponse } from 'next/server';
import { getTrainingData, logTrainingExport } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { 
      format = 'jsonl',
      filters = {},
      exportedBy = 'KPJMD'
    } = await request.json();

    // Get training data based on filters
    const trainingData = await getTrainingData(filters);

    if (trainingData.length === 0) {
      return NextResponse.json(
        { error: 'No training data found matching criteria' },
        { status: 404 }
      );
    }

    let exportContent: string;
    let fileName: string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'jsonl') {
      // JSONL format optimized for LoRA/PEFT fine-tuning
      exportContent = trainingData
        .map(item => {
          // Build the corrected response for training
          let finalResponse = item.response;
          
          // Apply corrections if they exist
          if (item.corrections_text) {
            finalResponse = item.corrections_text;
          }
          
          // Add additions if they exist
          if (item.additions_text) {
            finalResponse += '\n\n' + item.additions_text;
          }

          // Create instruction-response pair for fine-tuning
          const trainingExample = {
            instruction: item.question,
            input: "",
            output: finalResponse,
            metadata: {
              review_type: item.review_type,
              specialty: item.specialty,
              complexity: item.complexity,
              response_quality: item.response_quality,
              confidence_score: item.confidence_score,
              communication_quality: item.communication_quality,
              original_confidence: item.confidence,
              reviewer_notes: item.reviewer_notes,
              teaching_notes: item.teaching_notes,
              common_issues: item.common_issues,
              created_at: item.created_at
            }
          };

          return JSON.stringify(trainingExample);
        })
        .join('\n');
      
      fileName = `orthoiq-training-data-${timestamp}.jsonl`;
    
    } else if (format === 'csv') {
      // CSV format for analysis
      const headers = [
        'question', 'original_response', 'corrected_response', 'additions',
        'corrections', 'teaching_notes', 'review_type', 'specialty', 
        'complexity', 'response_quality', 'confidence_score', 
        'communication_quality', 'original_confidence', 'created_at'
      ];
      
      const rows = trainingData.map(item => {
        let finalResponse = item.response;
        if (item.corrections_text) finalResponse = item.corrections_text;
        if (item.additions_text) finalResponse += '\n\n' + item.additions_text;
        
        return [
          `"${(item.question || '').replace(/"/g, '""')}"`,
          `"${(item.response || '').replace(/"/g, '""')}"`,
          `"${finalResponse.replace(/"/g, '""')}"`,
          `"${(item.additions_text || '').replace(/"/g, '""')}"`,
          `"${(item.corrections_text || '').replace(/"/g, '""')}"`,
          `"${(item.teaching_notes || '').replace(/"/g, '""')}"`,
          item.review_type || '',
          item.specialty || '',
          item.complexity || '',
          item.response_quality || '',
          item.confidence_score || '',
          item.communication_quality || '',
          item.confidence || '',
          item.created_at || ''
        ].join(',');
      });
      
      exportContent = headers.join(',') + '\n' + rows.join('\n');
      fileName = `orthoiq-training-data-${timestamp}.csv`;
    
    } else {
      // JSON format for detailed analysis
      exportContent = JSON.stringify({
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: exportedBy,
          filters: filters,
          total_records: trainingData.length
        },
        training_data: trainingData.map(item => {
          let finalResponse = item.response;
          if (item.corrections_text) finalResponse = item.corrections_text;
          if (item.additions_text) finalResponse += '\n\n' + item.additions_text;
          
          return {
            id: item.id,
            question: item.question,
            original_response: item.response,
            corrected_response: finalResponse,
            review_details: {
              review_type: item.review_type,
              additions_text: item.additions_text,
              corrections_text: item.corrections_text,
              teaching_notes: item.teaching_notes,
              confidence_score: item.confidence_score,
              communication_quality: item.communication_quality
            },
            medical_category: {
              specialty: item.specialty,
              complexity: item.complexity,
              response_quality: item.response_quality,
              common_issues: item.common_issues
            },
            original_confidence: item.confidence,
            reviewer_notes: item.reviewer_notes,
            created_at: item.created_at
          };
        })
      }, null, 2);
      
      fileName = `orthoiq-training-data-${timestamp}.json`;
    }

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write file
    const filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, exportContent, 'utf8');

    // Log the export
    const exportId = await logTrainingExport(
      filters,
      format,
      trainingData.length,
      filePath,
      exportedBy
    );

    return NextResponse.json({
      success: true,
      export_id: exportId,
      file_name: fileName,
      file_path: filePath,
      record_count: trainingData.length,
      format: format,
      message: `Training data exported successfully in ${format.toUpperCase()} format`
    });

  } catch (error) {
    console.error('Error exporting training data:', error);
    return NextResponse.json(
      { error: 'Failed to export training data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'jsonl';
    const specialty = searchParams.get('specialty') || undefined;
    const complexity = searchParams.get('complexity') || undefined;
    const responseQuality = searchParams.get('responseQuality') || undefined;
    const reviewType = searchParams.get('reviewType') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const filters = {
      specialty,
      complexity,
      responseQuality,
      reviewType,
      limit
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key as keyof typeof filters] === undefined && delete filters[key as keyof typeof filters]
    );

    const trainingData = await getTrainingData(filters);

    return NextResponse.json({
      success: true,
      preview: trainingData.slice(0, 5), // Show first 5 records as preview
      total_records: trainingData.length,
      filters: filters,
      message: `Found ${trainingData.length} training records matching criteria`
    });

  } catch (error) {
    console.error('Error previewing training data:', error);
    return NextResponse.json(
      { error: 'Failed to preview training data' },
      { status: 500 }
    );
  }
}