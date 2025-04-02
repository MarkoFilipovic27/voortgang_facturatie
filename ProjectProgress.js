import React, { useState } from 'react';
import { Table, Input, Button, message, Modal } from 'antd';
// ... existing imports ...

const ProjectProgress = ({ project, onProgressUpdate, onRefreshData }) => {
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const handleProgressChange = (value, record) => {
        const newProgress = parseInt(value);
        if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
            onProgressUpdate(record.phaseCode, newProgress);
        }
    };

    const handleSubmitProgress = async () => {
        setLoading(true);
        try {
            // Filter phases that have a new progress value and a toInvoice amount
            const phasesToProcess = project.phases.filter(
                phase => phase.newProgress !== null && 
                phase.newProgress !== undefined && 
                phase.toInvoice > 0
            );

            if (phasesToProcess.length === 0) {
                messageApi.info('Er zijn geen nieuwe voortgangspercentages of te factureren bedragen gevonden.');
                setLoading(false);
                return;
            }

            // Confirm with user
            Modal.confirm({
                title: 'Voortgang verwerken',
                content: `Weet u zeker dat u de voortgang wilt verwerken? Er zullen ${phasesToProcess.length} factuurregels worden aangemaakt.`,
                okText: 'Ja, verwerken',
                cancelText: 'Annuleren',
                onOk: async () => {
                    const results = [];
                    
                    // Process each phase
                    for (const phase of phasesToProcess) {
                        const result = await window.afasApi.createInvoiceLine(
                            project.projectCode,
                            phase.phaseCode,
                            phase.toInvoice
                        );
                        results.push({
                            phase: phase.phaseCode,
                            ...result
                        });
                    }

                    // Show results
                    const successCount = results.filter(r => r.success).length;
                    const failCount = results.filter(r => !r.success).length;

                    if (failCount > 0) {
                        Modal.error({
                            title: 'Niet alle factuurregels zijn verwerkt',
                            content: (
                                <div>
                                    <p>{`${successCount} factuurregels zijn succesvol verwerkt.`}</p>
                                    <p>{`${failCount} factuurregels zijn niet verwerkt.`}</p>
                                    <div style={{ marginTop: '20px' }}>
                                        <h4>Details:</h4>
                                        {results.filter(r => !r.success).map((result, index) => (
                                            <p key={index}>{`Fase ${result.phase}: ${result.message}`}</p>
                                        ))}
                                    </div>
                                </div>
                            )
                        });
                    } else {
                        messageApi.success('Alle factuurregels zijn succesvol verwerkt!');
                    }

                    // Refresh data and reset progress
                    await onRefreshData();
                }
            });
        } catch (error) {
            messageApi.error('Er is een fout opgetreden bij het verwerken van de voortgang.');
            console.error('Error processing progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Fase',
            dataIndex: 'phaseCode',
            key: 'phaseCode',
        },
        {
            title: 'Omschrijving',
            dataIndex: 'phaseDescription',
            key: 'phaseDescription',
        },
        {
            title: 'Aanneemsom',
            dataIndex: 'contractSum',
            key: 'contractSum',
            render: (value) => value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }),
        },
        {
            title: 'Kosten',
            dataIndex: 'actualCosts',
            key: 'actualCosts',
            render: (value) => value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }),
        },
        {
            title: 'Gefactureerd',
            dataIndex: 'invoiced',
            key: 'invoiced',
            render: (value) => value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }),
        },
        {
            title: 'Huidige voortgang',
            dataIndex: 'progress',
            key: 'progress',
            render: (value) => `${value}%`,
        },
        {
            title: 'Nieuwe voortgang',
            dataIndex: 'newProgress',
            key: 'newProgress',
            render: (value, record) => (
                <Input
                    style={{ width: '80px' }}
                    suffix="%"
                    value={value === null ? '' : value}
                    onChange={(e) => handleProgressChange(e.target.value, record)}
                />
            ),
        },
        {
            title: 'Te factureren',
            dataIndex: 'toInvoice',
            key: 'toInvoice',
            render: (value) => value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }),
        },
    ];

    return (
        <div>
            {contextHolder}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Project Voortgang: {project.projectCode} - {project.projectDescription}</h2>
                <Button 
                    type="primary"
                    onClick={handleSubmitProgress}
                    loading={loading}
                >
                    Verwerk Voortgang
                </Button>
            </div>
            <Table 
                dataSource={project.phases}
                columns={columns}
                rowKey="phaseCode"
                pagination={false}
            />
        </div>
    );
};

export default ProjectProgress; 